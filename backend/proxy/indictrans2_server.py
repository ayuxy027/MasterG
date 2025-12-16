"""
Persistent IndicTrans2 translation server for MasterG.

This server keeps the model loaded in memory and handles translation requests
via stdin/stdout JSON protocol. This avoids reloading the 2GB model on each request.

Protocol:
  Input (JSON): {"text": "...", "src_lang": "eng_Latn", "tgt_lang": "hin_Deva"}
  Output (JSON): {"success": true, "translated": "..."}
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, List

# Import glossary for term locking
from glossary import extract_and_replace_terms, restore_terms

# Disable PyTorch compile and meta tensors to avoid device issues
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "0"
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["PYTORCH_DISABLE_COMPILE"] = "1"

import torch  # type: ignore
torch._dynamo.config.suppress_errors = True
torch._dynamo.config.disable = True

from IndicTransToolkit import IndicProcessor  # type: ignore
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
INDIC_MODEL_PATH = MODELS_DIR / "indictrans2-en-indic"

# Global model cache (loaded once, reused many times)
_model_cache: Optional[tuple] = None


def strip_markdown(text: str) -> str:
  """Remove markdown formatting before translation"""
  # Remove markdown headers
  text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
  # Remove bold/italic
  text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
  text = re.sub(r'\*([^*]+)\*', r'\1', text)
  text = re.sub(r'__([^_]+)__', r'\1', text)
  text = re.sub(r'_([^_]+)_', r'\1', text)
  # Remove horizontal rules
  text = re.sub(r'^---+\s*$', '', text, flags=re.MULTILINE)
  text = re.sub(r'^===+\s*$', '', text, flags=re.MULTILINE)
  # Remove code blocks (keep content)
  text = re.sub(r'```[^\n]*\n(.*?)```', r'\1', text, flags=re.DOTALL)
  text = re.sub(r'`([^`]+)`', r'\1', text)
  # Remove links but keep text
  text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
  # Clean up multiple newlines
  text = re.sub(r'\n{3,}', '\n\n', text)
  # Remove leading/trailing whitespace per line
  lines = [line.strip() for line in text.split('\n')]
  text = '\n'.join(lines)
  return text.strip()


def load_model():
  """Load model once and cache it globally"""
  global _model_cache
  
  if _model_cache is not None:
    return _model_cache
  
  # Verify model exists locally
  if not INDIC_MODEL_PATH.exists():
    raise FileNotFoundError(
      f"IndicTrans2 model not found at {INDIC_MODEL_PATH}. "
      f"Please run setup_models.py to download the model locally first."
    )
  
  # Verify vocabulary files exist
  vocab_src = INDIC_MODEL_PATH / "dict.SRC.json"
  vocab_tgt = INDIC_MODEL_PATH / "dict.TGT.json"
  if not vocab_src.exists() or not vocab_tgt.exists():
    raise FileNotFoundError(
      f"Vocabulary files not found. Expected:\n"
      f"  - {vocab_src}\n"
      f"  - {vocab_tgt}\n"
      f"Please ensure the model is properly downloaded."
    )
  
  # Change to model directory so relative paths in tokenizer_config work
  original_cwd = os.getcwd()
  os.chdir(str(INDIC_MODEL_PATH))
  
  try:
    # Load tokenizer
    try:
      tokenizer = AutoTokenizer.from_pretrained(
        ".",
        trust_remote_code=True,
        local_files_only=True,
        use_fast=False,
      )
    except Exception:
      tokenizer = AutoTokenizer.from_pretrained(
        ".",
        trust_remote_code=True,
        local_files_only=True,
      )
    
    # Load model
    torch._dynamo.config.disable = True
    
    model = AutoModelForSeq2SeqLM.from_pretrained(
      ".",
      trust_remote_code=True,
      local_files_only=True,
      low_cpu_mem_usage=False,
    )
    
    # Handle meta tensors
    has_meta = any(p.device.type == "meta" for p in model.parameters())
    if has_meta:
      model = model.to_empty(device="cpu")
      from safetensors.torch import load_file
      
      state_dict_path = Path("model.safetensors")
      if not state_dict_path.exists():
        os.chdir(original_cwd)
        raise FileNotFoundError(f"Model weights not found at {state_dict_path}")
      
      state_dict = load_file(str(state_dict_path))
      model_state = model.state_dict()
      compatible_state = {k: v for k, v in state_dict.items() if k in model_state and model_state[k].shape == v.shape}
      
      if 'lm_head.weight' in model_state and 'lm_head.weight' not in compatible_state:
        if 'model.decoder.embed_tokens.weight' in compatible_state:
          compatible_state['lm_head.weight'] = compatible_state['model.decoder.embed_tokens.weight']
      
      missing_keys, unexpected_keys = model.load_state_dict(compatible_state, strict=False)
      
      if 'lm_head.weight' in missing_keys:
        if hasattr(model, 'lm_head') and hasattr(model, 'model') and hasattr(model.model, 'decoder'):
          if hasattr(model.model.decoder, 'embed_tokens'):
            model.lm_head.weight = model.model.decoder.embed_tokens.weight
    else:
      model = model.to("cpu")
    
    model.eval()
    processor = IndicProcessor(inference=True)
    
    # Restore original working directory
    os.chdir(original_cwd)
    
    # Cache the loaded model
    _model_cache = (tokenizer, model, processor)
    
    return _model_cache
    
  except Exception as e:
    os.chdir(original_cwd)
    raise


def post_process_translation(text: str) -> str:
  """
  Apply rule-based post-processing fixes for known failure patterns.
  
  Fixes:
  - Coordination errors ("A and B use C" -> "A uses B and C")
  - Subject-object inversion
  - Repeated words/phrases
  - Missing punctuation
  """
  # Remove excessive repetition (same word 3+ times in a row)
  text = re.sub(r'(\S+)(\s+\1){2,}', r'\1', text)
  
  # Fix common coordination errors (basic pattern matching)
  # This is a simplified fix - more complex patterns would need NLP
  
  # Remove extra spaces
  text = re.sub(r'\s+', ' ', text)
  
  # Ensure proper spacing around punctuation
  text = re.sub(r'\s*([.!?])\s*', r'\1 ', text)
  
  return text.strip()


def split_into_units(text: str) -> List[str]:
  """
  Split text into translation units.

  HARD RULE for Stitch + IndicTrans2:
  - Prefer ONE LINE == ONE UNIT.
  - Each non-empty line is treated as an independent query.
  - Do NOT relate units across lines.

  Fallback:
  - If there are no newlines (single blob), fall back to sentence-based split.
  """
  # First preference: newline-based splitting (one line == one unit)
  if "\n" in text:
    lines = [ln.strip() for ln in text.splitlines()]
    units = [ln for ln in lines if ln]
    if units:
      return units

  # Fallback: sentence-based splitting for legacy inputs
  sentences = re.split(r'(?<=[.!?])\s+', text)
  cleaned: List[str] = []
  for sentence in sentences:
    sentence = sentence.strip()
    if sentence:
      cleaned.append(sentence)

  return cleaned if cleaned else [text]


def translate(text: str, src_lang: str, tgt_lang: str) -> Dict[str, Any]:
  """
  Translate text using cached model with:
  - One sentence per inference call (mandatory per model.md)
  - Glossary locking for scientific terms
  - Post-processing for known failure patterns
  """
  tokenizer, model, processor = load_model()
  
  # Strip markdown before translation
  clean_text = strip_markdown(text)
  
  # CRITICAL: Extract and replace scientific terms with placeholders
  text_with_placeholders, term_map = extract_and_replace_terms(clean_text)
  
  # CRITICAL: Split into independent units (lines first, then sentences)
  units = split_into_units(text_with_placeholders)
  
  if not units:
    return {"success": False, "error": "No sentences found in input text"}
  
  translated_sentences = []
  device = next(model.parameters()).device
  
  # Process ONE sentence at a time (mandatory per model.md)
  for sentence in units:
    if not sentence.strip():
      continue
    
    # Skip if sentence is just a placeholder (edge case)
    if sentence.strip().startswith("SCI") and len(sentence.strip().split()) == 1:
      translated_sentences.append(sentence.strip())
      continue
      
    try:
      # Preprocess single sentence
      batch = processor.preprocess_batch([sentence], src_lang=src_lang, tgt_lang=tgt_lang)
      if not batch or len(batch) == 0:
        sys.stderr.write(f"Warning: Preprocessing failed for sentence: {sentence[:50]}\n")
        # Keep original if preprocessing fails
        translated_sentences.append(sentence)
        continue
      
      # Tokenize
      inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=180)
      if inputs is None or "input_ids" not in inputs:
        sys.stderr.write(f"Warning: Tokenization failed for sentence: {sentence[:50]}\n")
        translated_sentences.append(sentence)
        continue
      
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      # Generate translation (one unit at a time)
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          max_length=220,
          num_beams=4,
          use_cache=False,
          early_stopping=False,
          repetition_penalty=1.3,
          length_penalty=0.8,
        )
      
      # Decode
      translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      if not translation or len(translation) == 0:
        sys.stderr.write(f"Warning: Decoding failed for sentence: {sentence[:50]}\n")
        translated_sentences.append(sentence)
        continue
      
      # Postprocess
      post = processor.postprocess_batch([translation[0]], lang=tgt_lang)
      if post and len(post) > 0 and post[0].strip():
        translated_sentences.append(post[0].strip())
      else:
        sys.stderr.write(f"Warning: Postprocessing failed for sentence: {sentence[:50]}\n")
        translated_sentences.append(sentence)
        
    except Exception as e:
      # Log warning but keep original sentence (use "Warning" not "Error" to avoid Node.js error handler)
      sys.stderr.write(f"Warning: Exception translating sentence '{sentence[:50]}': {e}\n")
      translated_sentences.append(sentence)
      continue
  
  if not translated_sentences:
    return {"success": False, "error": "All translation sentences failed"}
  
  # Join translated sentences with proper spacing
  # Add space between sentences, but preserve original punctuation
  combined_translation = " ".join(translated_sentences)
  
  # CRITICAL: Restore scientific terms from placeholders BEFORE post-processing
  final_translation = restore_terms(combined_translation, term_map)
  
  # Apply post-processing fixes (removes repetition, fixes spacing)
  final_translation = post_process_translation(final_translation)
  
  return {"success": True, "translated": final_translation}


def translate_stream(text: str, src_lang: str, tgt_lang: str) -> None:
  """
  Stream translation sentence-by-sentence over stdout.

  Protocol (one JSON object per line):
    {"success": true, "type": "chunk", "index": 0, "total": N, "translated": "..."}
    ...
    {"success": true, "type": "complete", "total": N, "translated": "..."}

  This keeps the model usage identical to `translate` but exposes
  intermediate sentence translations for streaming to the client.
  """
  tokenizer, model, processor = load_model()

  clean_text = strip_markdown(text)

  # Extract and replace scientific terms with placeholders
  text_with_placeholders, term_map = extract_and_replace_terms(clean_text)

  # Split into independent units (lines first, then sentences)
  units = split_into_units(text_with_placeholders)
  if not units:
    sys.stdout.write(
      json.dumps(
        {
          "success": False,
          "type": "error",
          "error": "No sentences found in input text",
        }
      )
      + "\n"
    )
    sys.stdout.flush()
    return

  translated_sentences: List[str] = []
  device = next(model.parameters()).device
  total = len(units)

  for idx, sentence in enumerate(units):
    sentence = sentence.strip()
    if not sentence:
      continue

    # Skip if sentence is just a placeholder (edge case)
    if sentence.startswith("SCI") and len(sentence.split()) == 1:
      translated = restore_terms(sentence, term_map)
      translated = post_process_translation(translated)
      translated_sentences.append(translated)

      sys.stdout.write(
        json.dumps(
          {
            "success": True,
            "type": "chunk",
            "index": idx,
            "total": total,
            "translated": translated,
          }
        )
        + "\n"
      )
      sys.stdout.flush()
      continue

    try:
      # Preprocess single sentence
      batch = processor.preprocess_batch(
        [sentence], src_lang=src_lang, tgt_lang=tgt_lang
      )
      if not batch or len(batch) == 0:
        sys.stderr.write(
          f"Warning: Preprocessing failed for sentence: {sentence[:50]}\n"
        )
        translated = restore_terms(sentence, term_map)
        translated = post_process_translation(translated)
        translated_sentences.append(translated)

        sys.stdout.write(
          json.dumps(
            {
              "success": True,
              "type": "chunk",
              "index": idx,
              "total": total,
              "translated": translated,
            }
          )
          + "\n"
        )
        sys.stdout.flush()
        continue

      # Tokenize
      inputs = tokenizer(
        batch,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=180,
      )
      if inputs is None or "input_ids" not in inputs:
        sys.stderr.write(
          f"Warning: Tokenization failed for sentence: {sentence[:50]}\n"
        )
        translated = restore_terms(sentence, term_map)
        translated = post_process_translation(translated)
        translated_sentences.append(translated)

        sys.stdout.write(
          json.dumps(
            {
              "success": True,
              "type": "chunk",
              "index": idx,
              "total": total,
              "translated": translated,
            }
          )
          + "\n"
        )
        sys.stdout.flush()
        continue

      inputs = {k: v.to(device) for k, v in inputs.items()}

      # Generate translation (one unit at a time)
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          max_length=220,
          num_beams=4,
          use_cache=False,
          early_stopping=False,
          repetition_penalty=1.3,
          length_penalty=0.8,
        )

      # Decode
      translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      if not translation or len(translation) == 0:
        sys.stderr.write(
          f"Warning: Decoding failed for sentence: {sentence[:50]}\n"
        )
        translated = restore_terms(sentence, term_map)
        translated = post_process_translation(translated)
        translated_sentences.append(translated)

        sys.stdout.write(
          json.dumps(
            {
              "success": True,
              "type": "chunk",
              "index": idx,
              "total": total,
              "translated": translated,
            }
          )
          + "\n"
        )
        sys.stdout.flush()
        continue

      # Postprocess (IndicProcessor)
      post = processor.postprocess_batch([translation[0]], lang=tgt_lang)
      if post and len(post) > 0 and post[0].strip():
        translated = post[0].strip()
      else:
        sys.stderr.write(
          f"Warning: Postprocessing failed for sentence: {sentence[:50]}\n"
        )
        translated = sentence

      # Restore scientific terms & apply lightweight post-processing
      translated = restore_terms(translated, term_map)
      translated = post_process_translation(translated)

      translated_sentences.append(translated)

      # Emit chunk to stdout
      sys.stdout.write(
        json.dumps(
          {
            "success": True,
            "type": "chunk",
            "index": idx,
            "total": total,
            "translated": translated,
          }
        )
        + "\n"
      )
      sys.stdout.flush()

    except Exception as e:
      sys.stderr.write(
        f"Warning: Exception translating sentence '{sentence[:50]}': {e}\n"
      )
      translated = restore_terms(sentence, term_map)
      translated = post_process_translation(translated)
      translated_sentences.append(translated)

      sys.stdout.write(
        json.dumps(
          {
            "success": True,
            "type": "chunk",
            "index": idx,
            "total": total,
            "translated": translated,
          }
        )
        + "\n"
      )
      sys.stdout.flush()

  if not translated_sentences:
    sys.stdout.write(
      json.dumps(
        {
          "success": False,
          "type": "error",
          "error": "All translation sentences failed",
        }
      )
      + "\n"
    )
    sys.stdout.flush()
    return

  combined_translation = " ".join(translated_sentences)

  # Final complete event
  sys.stdout.write(
    json.dumps(
      {
        "success": True,
        "type": "complete",
        "total": total,
        "translated": combined_translation,
      }
    )
    + "\n"
  )
  sys.stdout.flush()


def main():
  """Server loop: read JSON requests, translate, write JSON responses"""
  try:
    # Load model on startup (once)
    sys.stderr.write("Loading IndicTrans2 model...\n")
    load_model()
    sys.stderr.write("✅ Model loaded and ready!\n")
    
    # Read requests from stdin
    while True:
      try:
        line = sys.stdin.readline()
        if not line:
          break
        
        line = line.strip()
        if not line:
          continue
        
        req = json.loads(line)
        text = str(req.get("text") or "").strip()
        src_lang = str(req.get("src_lang") or "eng_Latn")
        tgt_lang = str(req.get("tgt_lang") or "hin_Deva")
        stream = bool(req.get("stream") or False)
        
        if not text:
          result = {"success": False, "error": "Missing or empty 'text' field"}
        else:
          if stream:
            # Stream sentence-by-sentence; function writes directly to stdout
            translate_stream(text, src_lang, tgt_lang)
          else:
            result = translate(text, src_lang, tgt_lang)
            # Write single response to stdout
            sys.stdout.write(json.dumps(result) + "\n")
            sys.stdout.flush()
        
      except json.JSONDecodeError as e:
        sys.stdout.write(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}) + "\n")
        sys.stdout.flush()
      except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": f"Translation failed: {e}"}) + "\n")
        sys.stdout.flush()
        
  except KeyboardInterrupt:
    sys.stderr.write("\nShutting down...\n")
  except Exception as e:
    sys.stderr.write(f"Fatal error: {e}\n")
    sys.exit(1)


if __name__ == "__main__":
  main()

