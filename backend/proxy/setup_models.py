"""
MasterG model setup script for translation models.

This script downloads translation models ONCE from Hugging Face Hub
and saves them locally to backend/proxy/models/. After this initial download,
the models run completely offline with no internet connection required.

IMPORTANT: This is a ONE-TIME setup. Once downloaded, the models are stored
locally and will run completely offline.

Usage (from backend/proxy/):
  source venv/bin/activate
  python setup_models.py

Requirements:
  - Internet connection (for initial download only)
  - Hugging Face account
  - huggingface-cli login (if models are gated)
"""

import os
from pathlib import Path

from huggingface_hub import snapshot_download  # type: ignore
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore
import torch  # type: ignore


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = Path(os.environ.get("NLLB_MODELS_DIR", BASE_DIR / "models")).expanduser().resolve()
DEFAULT_MODEL_SUBDIR = "nllb-200-distilled-600M"
NLLB_MODEL_ID = "facebook/nllb-200-distilled-600M"
NLLB_MODEL_PATH = Path(
  os.environ.get("NLLB_MODEL_PATH", MODELS_DIR / DEFAULT_MODEL_SUBDIR)
).expanduser().resolve()
REQUIRED_FILES = [
  "config.json",
  "tokenizer.json",
  "sentencepiece.bpe.model",
]
WEIGHT_FILES = ["pytorch_model.bin", "model.safetensors"]


def setup_nllb() -> None:
  """Download NLLB-200 model if not already present"""
  print()
  print("Setting up NLLB-200 for MasterG...")
  print("⚠️  ONE-TIME DOWNLOAD: This requires internet connection.")
  print("   After download, the model runs completely offline.")
  print()
  
  print(f"Target directory: {NLLB_MODEL_PATH}")
  print(f"Downloading NLLB-200 model: {NLLB_MODEL_ID}")
  print("   This may take a few minutes (~2.4GB download)...")
  print("   Files will be stored locally for fully offline use.")
  
  try:
    NLLB_MODEL_PATH.mkdir(parents=True, exist_ok=True)
    
    # Use snapshot_download to place all artifacts in our local directory
    print("   Downloading snapshot to local directory...")
    snapshot_download(
      repo_id=NLLB_MODEL_ID,
      local_dir=NLLB_MODEL_PATH,
      local_dir_use_symlinks=False,
      allow_patterns="*",
    )
    print("   ✅ Snapshot downloaded")
    
    # Validate required files exist
    missing = [
      fname for fname in REQUIRED_FILES if not (NLLB_MODEL_PATH / fname).exists()
    ]
    if not any((NLLB_MODEL_PATH / fname).exists() for fname in WEIGHT_FILES):
      missing.append("pytorch_model.bin or model.safetensors")
    if missing:
      raise FileNotFoundError(
        f"Missing required files in {NLLB_MODEL_PATH}: {', '.join(missing)}"
      )
    
    # Quick load/verify from local path
    print("   Verifying tokenizer/model load from local path...")
    tokenizer = AutoTokenizer.from_pretrained(
      NLLB_MODEL_PATH,
      trust_remote_code=True,
      local_files_only=True,
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(
      NLLB_MODEL_PATH,
      trust_remote_code=True,
      local_files_only=True,
    )
    _ = tokenizer("hello")  # simple smoke test
    _ = model.to("meta")  # lightweight check (keeps memory low)
    print("   ✅ Local load verified (offline ready)")
    
    print(f"✅ NLLB-200 model stored locally at {NLLB_MODEL_PATH}")
    print("   The model will be loaded strictly from disk (no network).")
    
  except Exception as e:
    print()
    print(f"❌ NLLB-200 download failed: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check internet connection")
    print("2. Ensure transformers library is installed: pip install transformers")
    print("3. For gated models, run: huggingface-cli login")
    raise


def setup_models() -> None:
  """Download NLLB-200 translation model"""
  MODELS_DIR.mkdir(parents=True, exist_ok=True)
  
  print("=" * 60)
  print("MasterG Translation Model Setup (NLLB-200)")
  print("=" * 60)
  print()
  
  # Setup NLLB-200 (only translation model)
  try:
    setup_nllb()
  except Exception as e:
    print(f"❌ NLLB-200 setup failed: {e}")
    raise
  
  print()
  print("=" * 60)
  print("✅ MasterG model setup complete!")
  print("=" * 60)
  print()
  print("NLLB-200 is now cached and will run offline.")
  print("This is the only translation model used by MasterG.")


if __name__ == "__main__":
  setup_models()


