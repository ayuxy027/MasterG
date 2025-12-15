"""
IndicTrans2 translation proxy for MasterG Stitch feature.

Reads a single JSON object from stdin:
  {
    "text": "some content",
    "src_lang": "eng_Latn",
    "tgt_lang": "hin_Deva"
  }

Writes JSON to stdout:
  {
    "success": true/false,
    "translated": "...",
    "error": "...",
    "log": "optional debug info"
  }
"""

import json
import sys
import os
from pathlib import Path
from typing import Any, Dict

# Disable PyTorch compile and meta tensors to avoid device issues
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "0"
torch_compile_disable = os.environ.get("PYTORCH_DISABLE_COMPILE", "1")
if torch_compile_disable == "1":
    os.environ["TORCH_COMPILE_DISABLE"] = "1"

import torch  # type: ignore
torch._dynamo.config.suppress_errors = True  # Disable dynamo tracing
torch._dynamo.config.disable = True  # Completely disable dynamo

from IndicTransToolkit import IndicProcessor  # type: ignore
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
INDIC_MODEL_PATH = MODELS_DIR / "indictrans2-en-indic"


def load_model():
  # Verify model exists locally before loading
  if not INDIC_MODEL_PATH.exists():
    raise FileNotFoundError(
      f"IndicTrans2 model not found at {INDIC_MODEL_PATH}. "
      f"Please run setup_models.py to download the model locally first."
    )
  
  # Force local_files_only to prevent any Hugging Face Hub calls
  # IndicTrans2 uses custom tokenizer that needs trust_remote_code
  try:
    tokenizer = AutoTokenizer.from_pretrained(
      str(INDIC_MODEL_PATH),
      trust_remote_code=True,
      local_files_only=True,  # CRITICAL: Only load from local disk, no network calls
      use_fast=False,  # Use slow tokenizer to avoid issues with custom tokenization
    )
  except Exception as e:
    # Fallback: try without use_fast if error occurs
    tokenizer = AutoTokenizer.from_pretrained(
      str(INDIC_MODEL_PATH),
      trust_remote_code=True,
      local_files_only=True,
    )
  
  # Load model - force materialization (no meta tensors)
  # Disable torch compile before loading
  torch._dynamo.config.disable = True
  
  model = AutoModelForSeq2SeqLM.from_pretrained(
    str(INDIC_MODEL_PATH),
    trust_remote_code=True,
    local_files_only=True,  # CRITICAL: Only load from local disk, no network calls
    low_cpu_mem_usage=False,  # CRITICAL: Disable meta tensors
  )
  
  # Handle meta tensors using to_empty() and proper state dict loading
  has_meta = any(p.device.type == "meta" for p in model.parameters())
  if has_meta:
    # Use to_empty() to move from meta to CPU
    model = model.to_empty(device="cpu")
    
    # Load weights from safetensors
    from safetensors.torch import load_file
    
    state_dict_path = INDIC_MODEL_PATH / "model.safetensors"
    if not state_dict_path.exists():
      raise FileNotFoundError(f"Model weights not found at {state_dict_path}")
    
    state_dict = load_file(str(state_dict_path))
    
    # Load state dict - be lenient with missing keys
    model_state = model.state_dict()
    # Only load keys that exist in both
    compatible_state = {k: v for k, v in state_dict.items() if k in model_state and model_state[k].shape == v.shape}
    
    # Handle tied embeddings - if lm_head.weight is missing, it might be tied to decoder.embed_tokens
    if 'lm_head.weight' in model_state and 'lm_head.weight' not in compatible_state:
      if 'model.decoder.embed_tokens.weight' in compatible_state:
        # Tie the weights
        compatible_state['lm_head.weight'] = compatible_state['model.decoder.embed_tokens.weight']
    
    missing_keys, unexpected_keys = model.load_state_dict(compatible_state, strict=False)
    
    # If lm_head.weight is still missing and model uses tied embeddings, manually tie it
    if 'lm_head.weight' in missing_keys:
      if hasattr(model, 'lm_head') and hasattr(model, 'model') and hasattr(model.model, 'decoder'):
        if hasattr(model.model.decoder, 'embed_tokens'):
          model.lm_head.weight = model.model.decoder.embed_tokens.weight
  else:
    model = model.to("cpu")
  
  model.eval()
  processor = IndicProcessor(inference=True)
  return tokenizer, model, processor


def read_request() -> Dict[str, Any]:
  raw = sys.stdin.read()
  if not raw:
    return {"_error": "Empty stdin"}
  try:
    return json.loads(raw)
  except json.JSONDecodeError as e:
    return {"_error": f"Invalid JSON input: {e}"}


def translate(text: str, src_lang: str, tgt_lang: str) -> Dict[str, Any]:
  tokenizer, model, processor = load_model()

  # Preprocess text
  batch = processor.preprocess_batch([text], src_lang=src_lang, tgt_lang=tgt_lang)
  if not batch or len(batch) == 0:
    raise ValueError("Preprocessing returned empty batch")
  
  # Tokenize
  inputs = tokenizer(batch, return_tensors="pt", padding=True)
  if inputs is None or "input_ids" not in inputs:
    raise ValueError("Tokenization failed - no input_ids in result")
  
  # Move inputs to same device as model
  device = next(model.parameters()).device
  inputs = {k: v.to(device) for k, v in inputs.items()}

  # Generate translation using inference_mode to avoid meta tensor issues
  with torch.inference_mode():  # Use inference_mode instead of no_grad
    try:
      outputs = model.generate(
        **inputs,
        max_length=2048,  # 20x+ increased for long texts across all 22 languages
        num_beams=4,  # Increased beams for better quality
        use_cache=False,  # Disable cache to avoid None past_key_values issues
        early_stopping=True,
        min_length=10,  # Ensure minimum output length
      )
    except Exception as e:
      # Fallback: try with simpler generation
      if "meta" in str(e).lower():
        # Retry with even simpler generation params
        outputs = model.generate(
          **inputs,
          max_length=128,
          num_beams=1,
          do_sample=False,
          use_cache=False,
        )
      else:
        raise

  # Decode
  translation = tokenizer.batch_decode(outputs, skip_special_tokens=True)
  if not translation or len(translation) == 0:
    raise ValueError("Translation decoding returned empty result")
  
  # Postprocess
  post = processor.postprocess_batch([translation[0]], lang=tgt_lang)
  if not post or len(post) == 0:
    raise ValueError("Postprocessing returned empty result")

  return {"success": True, "translated": post[0]}


def main() -> None:
  req = read_request()
  if "_error" in req:
    sys.stdout.write(json.dumps({"success": False, "error": req["_error"]}))
    sys.stdout.flush()
    return

  text = str(req.get("text") or "").strip()
  src_lang = str(req.get("src_lang") or "eng_Latn")
  tgt_lang = str(req.get("tgt_lang") or "hin_Deva")

  if not text:
    sys.stdout.write(
      json.dumps({"success": False, "error": "Missing or empty 'text' field"})
    )
    sys.stdout.flush()
    return

  try:
    result = translate(text, src_lang, tgt_lang)
  except Exception as e:  # noqa: BLE001
    sys.stdout.write(
      json.dumps(
        {
          "success": False,
          "error": f"IndicTrans2 translation failed: {e}",
        }
      )
    )
    sys.stdout.flush()
    return

  sys.stdout.write(json.dumps(result))
  sys.stdout.flush()


if __name__ == "__main__":
  main()


