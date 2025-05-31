// hooks/useVideoPreloader.ts
import { useEffect, useRef } from 'react';

interface PreloadOptions {
  maxConcurrent?: number;
  timeoutMs?: number;
  onReady?: (url: string) => void;
  onFail?: (url: string, reason: string) => void;
}

export function useVideoPreloader(
  urls: string[],
  {
    maxConcurrent = 3,
    timeoutMs = 15_000,
    onReady,
    onFail,
  }: PreloadOptions = {}
) {
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef<Set<string>>(new Set());
  const abortMap = useRef<Map<string, AbortController>>(new Map());

  const startNext = () => {
    while (
      activeRef.current.size < maxConcurrent &&
      queueRef.current.length > 0
    ) {
      loadOne(queueRef.current.shift() as string);
    }
  };

  const loadOne = (url: string, attempt = 1) => {
    activeRef.current.add(url);

    const abort = new AbortController();
    abortMap.current.set(url, abort);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.muted = true;
    video.width = 1;
    video.height = 1;
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    document.body.appendChild(video);

    const finish = (reason?: string) => {
      video.remove();
      abortMap.current.delete(url);
      activeRef.current.delete(url);
      reason ? onFail?.(url, reason) : onReady?.(url);
      startNext();
    };

    const timer = window.setTimeout(() => {
      abort.abort();
      finish('timeout');
    }, timeoutMs);

    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timer);
      finish();
    });

    video.addEventListener('error', () => {
      clearTimeout(timer);
      if (attempt < 2) {
        setTimeout(() => loadOne(url, attempt + 1), 2_000 * attempt);
      } else {
        finish('error');
      }
    });

    video.load();
  };

  useEffect(() => {
    queueRef.current = [...urls];
    startNext();
    return () => {
      abortMap.current.forEach((c) => c.abort());
      activeRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join('|')]);
}
