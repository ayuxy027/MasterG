"""
MasterG model setup script for IndicTrans2.

This script downloads the IndicTrans2 model ONCE from Hugging Face Hub
and saves it locally to backend/proxy/models/. After this initial download,
the model runs completely offline with no internet connection required.

IMPORTANT: This is a ONE-TIME setup. Once downloaded, the model is stored
locally and IndicTrans2 will run completely offline.

Usage (from backend/proxy/):
  source venv/bin/activate
  python setup_models.py

Requirements:
  - Internet connection (for initial download only)
  - Hugging Face account with access to ai4bharat/indictrans2-en-indic-dist-200M
  - huggingface-cli login (if model is gated)
"""

from pathlib import Path

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore
import torch  # type: ignore


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
INDICTRANS2_PATH = MODELS_DIR / "indictrans2-en-indic"


def setup_models() -> None:
  MODELS_DIR.mkdir(parents=True, exist_ok=True)

  # Check if model already exists
  if INDICTRANS2_PATH.exists():
    print(f"⚠️  Model already exists at {INDICTRANS2_PATH}")
    print("   Delete this directory to re-download, or skip this step.")
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
    
    print()
    print(f"✅ IndicTrans2 model saved to: {INDICTRANS2_PATH}")
    print("✅ Model is now stored locally and will run offline!")
    print("✅ MasterG model setup complete!")
    
  except Exception as e:
    print()
    print(f"❌ Download failed: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check internet connection")
    print("2. For gated models, run: huggingface-cli login")
    print("3. Request access at: https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M")
    raise


if __name__ == "__main__":
  setup_models()


