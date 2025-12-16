"""
Persistent NLLB-200 translation server for MasterG.

This server keeps the model loaded in memory and handles translation requests
via stdin/stdout JSON protocol. This avoids reloading the 2.4GB model on each request.

Protocol:
  Input (JSON): {"text": "...", "src_lang": "eng_Latn", "tgt_lang": "hin_Deva"}
  Output (JSON): {"success": true, "translated": "..."}

NLLB-200 uses forced_bos_token_id for target language specification.
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, List

# Disable PyTorch compile and meta tensors to avoid device issues
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "0"
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["PYTORCH_DISABLE_COMPILE"] = "1"

import torch  # type: ignore
torch._dynamo.config.suppress_errors = True
torch._dynamo.config.disable = True

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
NLLB_MODEL_NAME = "facebook/nllb-200-distilled-600M"

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
  
  try:
    sys.stderr.write(f"Loading NLLB-200 model ({NLLB_MODEL_NAME})...\n")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
      NLLB_MODEL_NAME,
      trust_remote_code=True,
      local_files_only=False,  # Allow download on first run
    )
    
    # Load model
    model = AutoModelForSeq2SeqLM.from_pretrained(
      NLLB_MODEL_NAME,
      trust_remote_code=True,
      local_files_only=False,
      low_cpu_mem_usage=False,
    )
    
    # Auto-detect best device with acceleration support
    if torch.cuda.is_available():
      device = "cuda"
      sys.stderr.write("Using CUDA GPU acceleration\n")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
      device = "mps"  # Apple Silicon GPU
      sys.stderr.write("Using Apple Silicon (MPS) GPU acceleration\n")
    else:
      device = "cpu"
      sys.stderr.write("Using CPU (no GPU acceleration available)\n")
    
    model = model.to(device)
    model.eval()
    
    # Use torch.compile for faster inference on CUDA (PyTorch 2.0+)
    # Note: MPS doesn't support torch.compile yet, so skip for MPS
    try:
      if device == "cuda" and hasattr(torch, "compile"):
        # CUDA: Use torch.compile for faster inference
        model = torch.compile(model, mode="reduce-overhead")
        sys.stderr.write("Enabled torch.compile for CUDA optimization\n")
    except Exception as e:
      # Fallback if compile fails - model will still work, just slower
      sys.stderr.write(f"Note: torch.compile not available or failed: {e}\n")
    
    sys.stderr.write(f"✅ NLLB-200 model loaded on {device}!\n")
    
    # Cache the loaded model
    _model_cache = (tokenizer, model, device)
    
    return _model_cache
    
  except Exception as e:
    sys.stderr.write(f"❌ Failed to load NLLB-200 model: {e}\n")
    raise


def split_into_units(text: str) -> List[str]:
  """
  Split text into translation units.
  
  HARD RULE: Prefer ONE LINE == ONE UNIT.
  Each non-empty line is treated as an independent query.
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
  Translate text using cached NLLB-200 model.
  
  Uses forced_bos_token_id for target language specification.
  """
  tokenizer, model, device = load_model()
  
  # Strip markdown before translation
  clean_text = strip_markdown(text)
  
  # Split into independent units (lines first, then sentences)
  units = split_into_units(clean_text)
  
  if not units:
    return {"success": False, "error": "No sentences found in input text"}
  
  translated_sentences = []
  
  # Process ONE sentence at a time
  for sentence in units:
    if not sentence.strip():
      continue
    
    try:
      # Set source language for tokenizer (NLLB uses set_src_lang_special_tokens)
      tokenizer.src_lang = src_lang
      tokenizer.set_src_lang_special_tokens(src_lang)
      
      # Tokenize
      inputs = tokenizer(
        sentence,
        return_tensors="pt",
      )
      
      # Move to device
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      # Get target language token ID (NLLB uses language codes directly in vocab)
      vocab = tokenizer.get_vocab()
      if tgt_lang in vocab:
        tgt_lang_id = vocab[tgt_lang]
      elif "eng_Latn" in vocab:
        sys.stderr.write(f"Warning: Language code '{tgt_lang}' not found, using 'eng_Latn'\n")
        tgt_lang_id = vocab["eng_Latn"]
      else:
        sys.stderr.write(f"Warning: Could not find language code '{tgt_lang}', using default\n")
        tgt_lang_id = 256068  # Fallback to a common language code ID
      
      # Generate translation with forced_bos_token_id
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          forced_bos_token_id=tgt_lang_id,
          max_length=512,
          num_beams=4,
          use_cache=True,
          early_stopping=True,
          repetition_penalty=1.2,
          length_penalty=0.9,
        )
      
      # Decode
      translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      if translation and len(translation) > 0:
        translated_sentences.append(translation[0].strip())
      else:
        sys.stderr.write(f"Warning: Decoding failed for sentence: {sentence[:50]}\n")
        translated_sentences.append(sentence)
        
    except Exception as e:
      # Log warning but keep original sentence
      sys.stderr.write(f"Warning: Exception translating sentence '{sentence[:50]}': {e}\n")
      translated_sentences.append(sentence)
      continue
  
  if not translated_sentences:
    return {"success": False, "error": "All translation sentences failed"}
  
  # Join translated sentences with proper spacing
  combined_translation = " ".join(translated_sentences)
  
  return {"success": True, "translated": combined_translation}


def translate_stream(text: str, src_lang: str, tgt_lang: str) -> None:
  """
  Stream translation sentence-by-sentence over stdout.
  
  Protocol (one JSON object per line):
    {"success": true, "type": "chunk", "index": 0, "total": N, "translated": "..."}
    ...
    {"success": true, "type": "complete", "total": N, "translated": "..."}
  """
  tokenizer, model, device = load_model()

  clean_text = strip_markdown(text)

  # Split into independent units (lines first, then sentences)
  units = split_into_units(clean_text)
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
  total = len(units)

  for idx, sentence in enumerate(units):
    sentence = sentence.strip()
    if not sentence:
      continue

    try:
      # Set source language for tokenizer (NLLB uses set_src_lang_special_tokens)
      tokenizer.src_lang = src_lang
      tokenizer.set_src_lang_special_tokens(src_lang)
      
      # Tokenize
      inputs = tokenizer(
        sentence,
        return_tensors="pt",
      )
      
      # Move to device
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      # Get target language token ID (NLLB uses language codes directly in vocab)
      vocab = tokenizer.get_vocab()
      if tgt_lang in vocab:
        tgt_lang_id = vocab[tgt_lang]
      elif "eng_Latn" in vocab:
        sys.stderr.write(f"Warning: Language code '{tgt_lang}' not found, using 'eng_Latn'\n")
        tgt_lang_id = vocab["eng_Latn"]
      else:
        sys.stderr.write(f"Warning: Could not find language code '{tgt_lang}', using default\n")
        tgt_lang_id = 256068  # Fallback to a common language code ID
      
      # Generate translation
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          forced_bos_token_id=tgt_lang_id,
          max_length=512,
          num_beams=4,
          use_cache=True,
          early_stopping=True,
          repetition_penalty=1.2,
          length_penalty=0.9,
        )

      # Decode
      translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      if translation and len(translation) > 0:
        translated = translation[0].strip()
      else:
        sys.stderr.write(f"Warning: Decoding failed for sentence: {sentence[:50]}\n")
        translated = sentence

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
      translated = sentence
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
    sys.stderr.write("Loading NLLB-200 model...\n")
    load_model()
    sys.stderr.write("✅ NLLB-200 model loaded and ready!\n")
    
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

