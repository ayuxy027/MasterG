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

from pathlib import Path

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore
import torch  # type: ignore


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
INDICTRANS2_PATH = MODELS_DIR / "indictrans2-en-indic"
NLLB_MODEL_NAME = "facebook/nllb-200-distilled-600M"


def setup_indictrans2() -> None:
  """Download IndicTrans2 model if not already present"""
  if INDICTRANS2_PATH.exists():
    print(f"✅ IndicTrans2 model already exists at {INDICTRANS2_PATH}")
    return

  print("Setting up IndicTrans2 for MasterG...")
  print("⚠️  ONE-TIME DOWNLOAD: This requires internet connection.")
  print("   After download, the model runs completely offline.")
  print()
  
  indic_model_name = "ai4bharat/indictrans2-en-indic-dist-200M"

  print(f"Downloading IndicTrans2 model: {indic_model_name}")
  print("   This may take a few minutes (~2GB download)...")
  
  try:
    # Download model (requires internet - this is the ONLY time)
    model = AutoModelForSeq2SeqLM.from_pretrained(
      indic_model_name,
      trust_remote_code=True,
      torch_dtype=torch.float16,
    )
    model.save_pretrained(str(INDICTRANS2_PATH))

    # Download tokenizer (requires internet - this is the ONLY time)
    tokenizer = AutoTokenizer.from_pretrained(
      indic_model_name,
      trust_remote_code=True,
    )
    tokenizer.save_pretrained(str(INDICTRANS2_PATH))
    
    print(f"✅ IndicTrans2 model saved to: {INDICTRANS2_PATH}")
    
  except Exception as e:
    print()
    print(f"❌ IndicTrans2 download failed: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check internet connection")
    print("2. For gated models, run: huggingface-cli login")
    print("3. Request access at: https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M")
    raise


def setup_nllb() -> None:
  """Download NLLB-200 model if not already present"""
  # NLLB model is cached by transformers library in default cache
  # We'll download it to verify it works, but it's stored in HuggingFace cache
  print()
  print("Setting up NLLB-200 for MasterG...")
  print("⚠️  ONE-TIME DOWNLOAD: This requires internet connection.")
  print("   After download, the model runs completely offline.")
  print()
  
  print(f"Downloading NLLB-200 model: {NLLB_MODEL_NAME}")
  print("   This may take a few minutes (~2.4GB download)...")
  print("   Model will be cached by transformers library.")
  
  try:
    # Download tokenizer (to verify model is accessible)
    print("   Downloading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
      NLLB_MODEL_NAME,
      trust_remote_code=True,
    )
    print("   ✅ Tokenizer downloaded")
    
    # Download model (this will cache it in HuggingFace default cache)
    print("   Downloading model (this may take a while)...")
    model = AutoModelForSeq2SeqLM.from_pretrained(
      NLLB_MODEL_NAME,
      trust_remote_code=True,
    )
    print("   ✅ Model downloaded")
    
    print(f"✅ NLLB-200 model cached by transformers library")
    print("   Note: NLLB model is stored in HuggingFace cache (~/.cache/huggingface)")
    print("   The model will be automatically loaded from cache when needed.")
    
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
  """Download all translation models"""
  MODELS_DIR.mkdir(parents=True, exist_ok=True)
  
  print("=" * 60)
  print("MasterG Translation Models Setup")
  print("=" * 60)
  print()
  
  # Setup IndicTrans2 (optional, for compatibility)
  try:
    setup_indictrans2()
  except Exception as e:
    print(f"⚠️  IndicTrans2 setup skipped due to error: {e}")
    print("   You can set it up later if needed.")
  
  # Setup NLLB-200 (default model)
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
  print("Models are now cached and will run offline.")
  print("NLLB-200 is the default translation model.")


if __name__ == "__main__":
  setup_models()


