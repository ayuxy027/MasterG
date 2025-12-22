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
import multiprocessing
from pathlib import Path
from typing import Any, Dict, Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed

# Disable PyTorch compile and meta tensors to avoid device issues
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "0"
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["PYTORCH_DISABLE_COMPILE"] = "1"

# CPU Optimization: Enable MKL/OpenBLAS threading
# NOTE: These only affect CPU operations - GPU (CUDA/MPS) operations bypass these settings
# These optimize CPU matrix operations when GPU is not available
os.environ["OMP_NUM_THREADS"] = str(multiprocessing.cpu_count())
os.environ["MKL_NUM_THREADS"] = str(multiprocessing.cpu_count())
os.environ["NUMEXPR_NUM_THREADS"] = str(multiprocessing.cpu_count())

import torch  # type: ignore
torch._dynamo.config.suppress_errors = True
torch._dynamo.config.disable = True

# CPU Optimization: Set optimal number of threads for PyTorch
# NOTE: These settings only affect CPU operations - GPU operations use their own threading
# Use all available CPU cores for maximum performance (only when GPU is not available)
cpu_count = multiprocessing.cpu_count()
torch.set_num_threads(cpu_count)
torch.set_num_interop_threads(min(4, cpu_count // 2))  # Inter-op threads for parallel ops

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
    # PRIORITY: GPU (CUDA) > GPU (MPS/Apple Silicon) > CPU (fallback)
    # This ensures GPU is always preferred when available for team members with GPU laptops
    if torch.cuda.is_available():
      device = "cuda"
      sys.stderr.write("✅ Using CUDA GPU acceleration (GPU preferred)\n")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
      device = "mps"  # Apple Silicon GPU
      sys.stderr.write("✅ Using Apple Silicon (MPS) GPU acceleration (GPU preferred)\n")
    else:
      device = "cpu"
      cpu_info = f"CPU with {cpu_count} cores, {torch.get_num_threads()} threads"
      sys.stderr.write(f"⚡ Using CPU acceleration (GPU not available): {cpu_info}\n")
    
    model = model.to(device)
    model.eval()
    
    # CPU Optimization: Enable JIT optimizations for CPU inference
    if device == "cpu":
      # Use torch.jit.optimize_for_inference for CPU (if available)
      try:
        # Enable optimizations for CPU inference
        torch.set_flush_denormal(True)  # Flush denormal numbers for speed
        # Use optimized attention if available
        if hasattr(torch.backends, "cpu") and hasattr(torch.backends.cpu, "get_cpu_capability"):
          sys.stderr.write(f"CPU capability: {torch.backends.cpu.get_cpu_capability()}\n")
      except Exception as e:
        sys.stderr.write(f"Note: CPU optimization setup: {e}\n")
    
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


def translate(text: str, src_lang: str, tgt_lang: str, batch_size: int = None) -> Dict[str, Any]:
  """
  Translate text using cached NLLB-200 model with BATCH PROCESSING for acceleration.
  
  Uses forced_bos_token_id for target language specification.
  Processes multiple sentences at once for 3-5x speedup on GPU, 2-3x on CPU.
  
  CPU Optimization: Uses smaller batches and parallel processing for best CPU performance.
  """
  tokenizer, model, device = load_model()
  
  # Auto-detect optimal batch size based on device
  # GPU is always preferred - CPU optimizations only apply when GPU unavailable
  if batch_size is None:
    if device == "cpu":
      # CPU: Smaller batches (4-6) work better due to cache locality
      batch_size = min(6, max(4, cpu_count // 2))
    else:
      # GPU: Larger batches (8-16) for better parallelism
      # This applies to both CUDA and MPS (Apple Silicon) GPUs
      batch_size = 8
  
  # Strip markdown before translation
  clean_text = strip_markdown(text)
  
  # Split into independent units (lines first, then sentences)
  units = split_into_units(clean_text)
  
  if not units:
    return {"success": False, "error": "No sentences found in input text"}
  
  # Filter empty units
  units = [u.strip() for u in units if u.strip()]
  
  if not units:
    return {"success": False, "error": "No valid sentences found in input text"}
  
  translated_sentences = []
  
  # Set source language for tokenizer (once, before batching)
  tokenizer.src_lang = src_lang
  tokenizer.set_src_lang_special_tokens(src_lang)
  
  # Get target language token ID (once, before batching)
  vocab = tokenizer.get_vocab()
  if tgt_lang in vocab:
    tgt_lang_id = vocab[tgt_lang]
  elif "eng_Latn" in vocab:
    sys.stderr.write(f"Warning: Language code '{tgt_lang}' not found, using 'eng_Latn'\n")
    tgt_lang_id = vocab["eng_Latn"]
  else:
    sys.stderr.write(f"Warning: Could not find language code '{tgt_lang}', using default\n")
    tgt_lang_id = 256068  # Fallback to a common language code ID
  
  # CPU Optimization: Process batches in parallel for CPU
  # GPU: Sequential batches (GPU handles parallelism internally - no need for parallel batches)
  # NOTE: GPU is always preferred - parallel batches only used when device == "cpu"
  total_batches = (len(units) + batch_size - 1) // batch_size
  use_parallel_batches = (device == "cpu" and total_batches > 1 and cpu_count >= 4)
  
  # CPU Optimization: Helper function to process a single batch
  def process_batch(batch: List[str], batch_idx: int) -> tuple[int, List[str]]:
    """Process a single batch and return (batch_idx, translations)"""
    batch_translations = []
    try:
      # Tokenize entire batch at once
      inputs = tokenizer(
        batch,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
      )
      
      # Move to device
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      # CPU Optimization: Use CPU-friendly parameters
      beam_size = 1 if device == "cpu" else 2  # Greedy decoding on CPU is faster
      
      # Generate translation for entire batch with forced_bos_token_id
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          forced_bos_token_id=tgt_lang_id,
          max_length=512,
          num_beams=beam_size,
          use_cache=True,
          early_stopping=True,
          repetition_penalty=1.05 if device == "cpu" else 1.1,  # Lower for CPU speed
          length_penalty=0.7 if device == "cpu" else 0.8,  # Lower for CPU speed
          do_sample=False,  # Deterministic for consistency
        )
      
      # Decode entire batch at once
      translations = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      
      # Add translations to results
      for i, translation in enumerate(translations):
        if translation and translation.strip():
          batch_translations.append(translation.strip())
        else:
          # Fallback to original if translation failed
          sys.stderr.write(f"Warning: Decoding failed for sentence: {batch[i][:50]}\n")
          batch_translations.append(batch[i])
      
    except Exception as e:
      # If batch fails, fall back to individual processing for this batch
      sys.stderr.write(f"Warning: Batch translation failed, processing individually: {e}\n")
      for sentence in batch:
        try:
          # Fallback to single-sentence processing
          inputs = tokenizer(sentence, return_tensors="pt")
          inputs = {k: v.to(device) for k, v in inputs.items()}
          
          with torch.inference_mode():
            outputs = model.generate(
              **inputs,
              forced_bos_token_id=tgt_lang_id,
              max_length=512,
              num_beams=1 if device == "cpu" else 2,
              use_cache=True,
              early_stopping=True,
            )
          
          translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
          if translation and len(translation) > 0:
            batch_translations.append(translation[0].strip())
          else:
            batch_translations.append(sentence)
        except Exception as e2:
          sys.stderr.write(f"Warning: Exception translating sentence '{sentence[:50]}': {e2}\n")
          batch_translations.append(sentence)
    
    return (batch_idx, batch_translations)
  
  # Process batches: parallel for CPU, sequential for GPU
  if use_parallel_batches:
    # CPU Optimization: Process multiple batches in parallel using ThreadPoolExecutor
    # This leverages multiple CPU cores effectively
    max_workers = min(4, cpu_count // 2)  # Don't overload CPU
    batch_results = [None] * total_batches
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
      # Submit all batch processing tasks
      future_to_batch = {}
      for batch_idx in range(0, len(units), batch_size):
        batch = units[batch_idx:batch_idx + batch_size]
        batch_num = batch_idx // batch_size
        future = executor.submit(process_batch, batch, batch_num)
        future_to_batch[future] = batch_num
      
      # Collect results as they complete
      for future in as_completed(future_to_batch):
        batch_num = future_to_batch[future]
        try:
          idx, translations = future.result()
          batch_results[idx] = translations
          sys.stderr.write(f"Translated batch {idx + 1}/{total_batches} ({len(translations)} sentences)\n")
        except Exception as e:
          sys.stderr.write(f"Error processing batch {batch_num + 1}: {e}\n")
          # Fallback: process this batch individually
          batch_start = batch_num * batch_size
          batch = units[batch_start:batch_start + batch_size]
          _, translations = process_batch(batch, batch_num)
          batch_results[batch_num] = translations
    
    # Combine all batch results in order
    for batch_result in batch_results:
      if batch_result:
        translated_sentences.extend(batch_result)
  else:
    # Sequential processing (for GPU or small CPU systems)
    for batch_idx in range(0, len(units), batch_size):
      batch = units[batch_idx:batch_idx + batch_size]
      batch_num = (batch_idx // batch_size) + 1
      
      _, batch_translations = process_batch(batch, batch_num - 1)
      translated_sentences.extend(batch_translations)
      
      # Log progress for large translations
      if total_batches > 1:
        sys.stderr.write(f"Translated batch {batch_num}/{total_batches} ({len(batch)} sentences)\n")
  
  if not translated_sentences:
    return {"success": False, "error": "All translation sentences failed"}
  
  # Join translated sentences with proper spacing
  combined_translation = " ".join(translated_sentences)
  
  return {"success": True, "translated": combined_translation}


def translate_stream(text: str, src_lang: str, tgt_lang: str, batch_size: int = None) -> None:
  """
  Stream translation sentence-by-sentence over stdout with BATCH PROCESSING.
  
  Protocol (one JSON object per line):
    {"success": true, "type": "chunk", "index": 0, "total": N, "translated": "..."}
    ...
    {"success": true, "type": "complete", "total": N, "translated": "..."}
  """
  tokenizer, model, device = load_model()
  
  # Auto-detect optimal batch size based on device
  # GPU is always preferred - CPU optimizations only apply when GPU unavailable
  if batch_size is None:
    if device == "cpu":
      batch_size = min(6, max(4, cpu_count // 2))
    else:
      # GPU: Larger batches for better parallelism (CUDA or MPS)
      batch_size = 8

  clean_text = strip_markdown(text)

  # Split into independent units (lines first, then sentences)
  units = split_into_units(clean_text)
  units = [u.strip() for u in units if u.strip()]
  
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

  # Set source language and get target lang ID once
  tokenizer.src_lang = src_lang
  tokenizer.set_src_lang_special_tokens(src_lang)
  
  vocab = tokenizer.get_vocab()
  if tgt_lang in vocab:
    tgt_lang_id = vocab[tgt_lang]
  elif "eng_Latn" in vocab:
    tgt_lang_id = vocab["eng_Latn"]
  else:
    tgt_lang_id = 256068

  # CPU Optimization: Use CPU-friendly parameters
  beam_size = 1 if device == "cpu" else 2  # Greedy decoding on CPU
  rep_penalty = 1.05 if device == "cpu" else 1.1
  len_penalty = 0.7 if device == "cpu" else 0.8

  # Process in batches for speed, but emit individual chunks for streaming
  for batch_idx in range(0, len(units), batch_size):
    batch = units[batch_idx:batch_idx + batch_size]
    
    try:
      # Tokenize entire batch
      inputs = tokenizer(
        batch,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
      )
      
      inputs = {k: v.to(device) for k, v in inputs.items()}
      
      # Generate translation for batch with CPU-optimized parameters
      with torch.inference_mode():
        outputs = model.generate(
          **inputs,
          forced_bos_token_id=tgt_lang_id,
          max_length=512,
          num_beams=beam_size,
          use_cache=True,
          early_stopping=True,
          repetition_penalty=rep_penalty,
          length_penalty=len_penalty,
          do_sample=False,
        )

      # Decode batch
      translations = tokenizer.batch_decode(outputs, skip_special_tokens=True)
      
      # Emit each translation as a chunk
      for i, translation in enumerate(translations):
        idx = batch_idx + i
        translated = translation.strip() if translation and translation.strip() else batch[i]
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

    except Exception as e:
      # Fallback to individual processing for this batch
      sys.stderr.write(f"Warning: Batch failed, processing individually: {e}\n")
      for i, sentence in enumerate(batch):
        idx = batch_idx + i
        try:
          inputs = tokenizer(sentence, return_tensors="pt")
          inputs = {k: v.to(device) for k, v in inputs.items()}
          
          with torch.inference_mode():
            outputs = model.generate(
              **inputs,
              forced_bos_token_id=tgt_lang_id,
              max_length=512,
              num_beams=beam_size,
              use_cache=True,
              early_stopping=True,
            )
          
          translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
          translated = translation[0].strip() if translation and len(translation) > 0 else sentence
        except Exception as e2:
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
        batch_size = int(req.get("batch_size") or 8)  # Default batch size of 8
        
        if not text:
          result = {"success": False, "error": "Missing or empty 'text' field"}
        else:
          if stream:
            # Stream sentence-by-sentence; function writes directly to stdout
            translate_stream(text, src_lang, tgt_lang, batch_size)
          else:
            result = translate(text, src_lang, tgt_lang, batch_size)
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

