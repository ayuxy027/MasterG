# NLLB Translation Timeout Issue - Audit Report

## Problem
Translation was working perfectly, but after adding timeout handling, it stopped working.

## Root Cause Analysis

### Changes Made
1. Added timeout to `runPython()` - 5 minute timeout
2. Added timeout to `processQueue()` - 5 minute per-request timeout
3. Added `removeAllListeners()` in timeout handler

### Critical Issue Found

**Line 393-394 in `processQueue()`:**
```typescript
this.pythonProcess.stdout.removeAllListeners("data");
this.pythonProcess.stderr.removeAllListeners("data");
```

**Problem:**
- `removeAllListeners()` removes ALL listeners, not just the current request's listeners
- This breaks the queue system because:
  1. If timeout fires, it removes ALL listeners
  2. Subsequent requests in queue won't have listeners attached
  3. The Python process stdout/stderr becomes unmonitored
  4. Responses are lost

**Why it worked before:**
- No timeout = no `removeAllListeners()` call
- Listeners were properly managed with `.once()` which auto-removes after handling

**Why it breaks now:**
- Timeout handler calls `removeAllListeners()` which is too aggressive
- This removes listeners for ALL requests, not just the timed-out one
- Queue processing breaks because listeners are gone

## Solution

Instead of `removeAllListeners()`, we should:
1. Only remove the specific listeners for the timed-out request
2. Store listener references so we can remove them specifically
3. Or better: Let `.once()` handle cleanup naturally, and only clear timeout

## Fix Required

Replace `removeAllListeners()` with proper listener management:
- Store handler references
- Remove only the specific handlers
- Or use a different approach that doesn't break the queue

## Port 5001 Processes

The `lsof` output shows:
- One Node.js server listening (PID 69298) - **NORMAL**
- One established connection from browser - **NORMAL**
- One CLOSE_WAIT connection - **STALE, can be ignored**

This is normal for a web server. The issue is NOT related to multiple processes.

