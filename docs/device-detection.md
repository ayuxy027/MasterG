# Device Detection & GPU/CPU Toggling

## Overview
The Stitch translation system **automatically detects and prefers GPU** when available, falling back to CPU only when GPU is not detected. This ensures optimal performance for all team members regardless of their hardware.

## Device Detection Priority

The system uses the following priority order:

1. **CUDA GPU** (NVIDIA GPUs) - **Highest Priority** ✅
2. **MPS GPU** (Apple Silicon GPUs) - **High Priority** ✅  
3. **CPU** (Fallback) - Only used when GPU is not available ⚡

## How It Works

### Automatic Detection
```python
# Device detection logic (in nllb_server.py)
if torch.cuda.is_available():
    device = "cuda"  # NVIDIA GPU - PREFERRED
elif torch.backends.mps.is_available():
    device = "mps"   # Apple Silicon GPU - PREFERRED
else:
    device = "cpu"   # CPU fallback - only when GPU unavailable
```

### Team Compatibility

**For GPU Users** (Team members with GPU laptops):
- ✅ System automatically detects and uses GPU
- ✅ Gets GPU-optimized batch processing (8-16 sentences)
- ✅ Gets GPU-optimized parameters (beam search, etc.)
- ✅ No configuration needed - works automatically

**For CPU Users** (Team members without GPU):
- ⚡ System automatically falls back to CPU
- ⚡ Gets CPU-optimized batch processing (4-6 sentences)
- ⚡ Gets CPU-optimized parameters (greedy decoding, parallel batches)
- ⚡ No configuration needed - works automatically

## Verification

### Check Which Device is Being Used

When the NLLB server starts, it logs which device is detected:

**GPU Detected:**
```
✅ Using CUDA GPU acceleration (GPU preferred)
```
or
```
✅ Using Apple Silicon (MPS) GPU acceleration (GPU preferred)
```

**CPU Fallback:**
```
⚡ Using CPU acceleration (GPU not available): CPU with 8 cores, 8 threads
```

### Manual Verification

You can check device availability in Python:
```python
import torch

# Check CUDA (NVIDIA)
print(f"CUDA available: {torch.cuda.is_available()}")

# Check MPS (Apple Silicon)
print(f"MPS available: {hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()}")

# If both False, will use CPU
```

## Performance by Device

| Device | Batch Size | Parallel Batches | Expected Speed |
|--------|------------|------------------|----------------|
| CUDA GPU | 8-16 | No (GPU handles it) | ~10-15s for 50 sentences |
| MPS GPU | 8-16 | No (GPU handles it) | ~10-15s for 50 sentences |
| CPU (8+ cores) | 4-6 | Yes (4 workers) | ~10-12s for 50 sentences |
| CPU (4-6 cores) | 4-6 | Yes (2-3 workers) | ~12-15s for 50 sentences |
| CPU (2-4 cores) | 4 | No | ~15-20s for 50 sentences |

## Important Notes

### GPU is Always Preferred
- ✅ The system **never forces CPU** when GPU is available
- ✅ GPU detection happens automatically on server startup
- ✅ No manual configuration needed

### CPU Optimizations Don't Interfere with GPU
- ✅ CPU threading settings only affect CPU operations
- ✅ GPU operations (CUDA/MPS) bypass CPU threading settings
- ✅ Each device gets its own optimized parameters

### Team Collaboration
- ✅ **GPU users**: Get GPU acceleration automatically
- ✅ **CPU users**: Get CPU acceleration automatically
- ✅ **No conflicts**: Each team member's system uses what's available
- ✅ **Same codebase**: No device-specific code needed

## Troubleshooting

### Issue: GPU not detected when it should be

**Check:**
1. PyTorch installed with CUDA support: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`
2. CUDA drivers installed and working
3. Check logs for device detection messages

**Solution:**
- Reinstall PyTorch with GPU support
- Verify CUDA installation: `nvidia-smi`
- Check PyTorch CUDA: `python -c "import torch; print(torch.cuda.is_available())"`

### Issue: Want to force CPU (for testing)

**Note**: This is not recommended for production, but can be useful for testing.

**Temporary Solution:**
```python
# In nllb_server.py, temporarily modify device detection:
device = "cpu"  # Force CPU for testing
```

**Better Solution:**
Add environment variable support (future enhancement):
```bash
FORCE_CPU=true  # Force CPU even if GPU available
```

## Summary

✅ **GPU is always preferred** - automatically detected and used  
✅ **CPU is fallback only** - used when GPU unavailable  
✅ **No manual configuration** - works automatically for all team members  
✅ **Team compatible** - GPU and CPU users work seamlessly together  
✅ **Optimal performance** - each device gets its own optimizations  

The system ensures that:
- Team members with GPU laptops get GPU acceleration
- Team members with CPU-only laptops get optimized CPU acceleration
- No conflicts or manual configuration needed
- Best performance for everyone automatically

