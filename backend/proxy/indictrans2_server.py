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
from typing import Any, Dict, Optional

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


def translate(text: str, src_lang: str, tgt_lang: str) -> Dict[str, Any]:
  """Translate text using cached model"""
  tokenizer, model, processor = load_model()
  
  # Strip markdown before translation
  clean_text = strip_markdown(text)
  
  # Chunk long texts
  MAX_CHUNK_LENGTH = 400  # Reduced for better quality
  
  def chunk_text(text: str, max_chars: int) -> list[str]:
    """Split text into chunks at sentence boundaries"""
    if len(text) <= max_chars:
      return [text]
    
    chunks = []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    current_chunk = ""
    
    for sentence in sentences:
      sentence = sentence.strip()
      if not sentence:
        continue
      
      if len(sentence) > max_chars:
        if current_chunk:
          chunks.append(current_chunk.strip())
          current_chunk = ""
        parts = sentence.split(', ')
        for part in parts:
          if len(current_chunk) + len(part) + 2 <= max_chars:
            current_chunk += part + ", "
          else:
            if current_chunk:
              chunks.append(current_chunk.rstrip(', ').strip())
            current_chunk = part + ", "
        continue
      
      if len(current_chunk) + len(sentence) + 1 <= max_chars:
        current_chunk += sentence + " "
      else:
        if current_chunk:
          chunks.append(current_chunk.strip())
        current_chunk = sentence + " "
    
    if current_chunk:
      chunks.append(current_chunk.strip())
    
    return chunks if chunks else [text]
  
  text_chunks = chunk_text(clean_text, MAX_CHUNK_LENGTH)
  translated_chunks = []
  
  device = next(model.parameters()).device
  
  for chunk in text_chunks:
    if not chunk.strip():
      continue
      
    try:
      batch = processor.preprocess_batch([chunk], src_lang=src_lang, tgt_lang=tgt_lang)
      if not batch or len(batch) == 0:
        sys.stderr.write(f"Warning: Preprocessing returned empty batch for chunk: {chunk[:50]}\n")
        continue
      
      inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=180)
      if inputs is None or "input_ids" not in inputs:
        sys.stderr.write(f"Warning: Tokenization failed for chunk: {chunk[:50]}\n")
        continue
      
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          max_length=180,
          num_beams=2,  # Reduced for speed
          use_cache=False,
          early_stopping=True,
          repetition_penalty=1.3,  # Reduce repetition
          length_penalty=0.8,  # Shorter outputs
        )
      
      translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      if not translation or len(translation) == 0:
        sys.stderr.write(f"Warning: Decoding returned empty result for chunk: {chunk[:50]}\n")
        continue
      
      post = processor.postprocess_batch([translation[0]], lang=tgt_lang)
      if post and len(post) > 0 and post[0].strip():
        translated_chunks.append(post[0].strip())
      else:
        sys.stderr.write(f"Warning: Postprocessing returned empty result for chunk: {chunk[:50]}\n")
        
    except Exception as e:
      # Log error but continue with other chunks
      sys.stderr.write(f"Error translating chunk '{chunk[:50]}': {e}\n")
      import traceback
      sys.stderr.write(traceback.format_exc())
      continue
  
  if not translated_chunks:
    return {"success": False, "error": "All translation chunks failed. Check server logs for details."}
  
  final_translation = " ".join(translated_chunks)
  return {"success": True, "translated": final_translation}


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
        
        if not text:
          result = {"success": False, "error": "Missing or empty 'text' field"}
        else:
          result = translate(text, src_lang, tgt_lang)
        
        # Write response to stdout
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

