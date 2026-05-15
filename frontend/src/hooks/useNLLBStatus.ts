import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

interface NLLBStatus {
  connected: boolean;
  enabled: boolean;
  checking: boolean;
  error?: string;
}

interface RawStatus {
  connected?: boolean;
  enabled?: boolean;
  error?: string;
}

const TTL_MS = 30_000;
const subscribers = new Set<(state: NLLBStatus) => void>();
let cached: NLLBStatus | null = null;
let cachedAt = 0;
let inflight: Promise<NLLBStatus> | null = null;

async function probe(): Promise<NLLBStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stitch/status/nllb`);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as RawStatus | null;
      return {
        connected: false,
        enabled: data?.enabled ?? true,
        checking: false,
        error: data?.error ?? `HTTP ${response.status}`,
      };
    }
    const data = (await response.json()) as RawStatus;
    return {
      connected: Boolean(data.connected),
      enabled: Boolean(data.enabled),
      checking: false,
      error: data.error,
    };
  } catch (error) {
    return {
      connected: false,
      enabled: true,
      checking: false,
      error: error instanceof Error ? error.message : "NLLB service unavailable",
    };
  }
}

async function refresh(): Promise<NLLBStatus> {
  if (inflight) return inflight;
  inflight = (async () => {
    const result = await probe();
    cached = result;
    cachedAt = Date.now();
    subscribers.forEach((cb) => cb(result));
    inflight = null;
    return result;
  })();
  return inflight;
}

export function useNLLBStatus(): { status: NLLBStatus; refresh: () => Promise<NLLBStatus> } {
  const [status, setStatus] = useState<NLLBStatus>(
    cached ?? { connected: false, enabled: true, checking: true }
  );

  useEffect(() => {
    subscribers.add(setStatus);
    const isStale = !cached || Date.now() - cachedAt > TTL_MS;
    if (isStale) refresh();
    return () => {
      subscribers.delete(setStatus);
    };
  }, []);

  return { status, refresh };
}
