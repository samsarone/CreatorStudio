// useVideoPreloader.ts
import { useEffect, useRef } from 'react';

interface Options {
  maxConcurrent?: number;
  timeoutMs?: number;
  onReady?: (url: string) => void;
  onFail?: (url: string, reason: string) => void;
}

export function useVideoPreloader(urls: string[], opts: Options = {}) {
  const {
    maxConcurrent = 3,
    timeoutMs = 15000,
    onReady,
    onFail,
  } = opts;

  const queueRef = useRef<string[]>([]);
  const activeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    queueRef.current = [...urls];          // shallow copy
    startNext();
    return () => {                         // cleanup on unmount
      activeRef.current.forEach((u) => abortMap.get(u)?.abort());
      activeRef.current.clear();
    };
    // eslint-disable-next-line
  }, [urls.join('|')]);                    // restart if url list changes

  const abortMap = new Map<string, AbortController>();

  function startNext() {
    while (
      activeRef.current.size < maxConcurrent &&
      queueRef.current.length > 0
    ) {
      const url = queueRef.current.shift() as string;
      loadOne(url);
    }
  }

  function loadOne(url: string, attempt = 1) {
    activeRef.current.add(url);

    const abort = new AbortController();
    abortMap.set(url, abort);

    // create element that won’t be throttled
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.muted = true;
    video.width = 1; video.height = 1;
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    document.body.appendChild(video);

    const clear = (reason?: string) => {
      video.remove();
      abortMap.delete(url);
      activeRef.current.delete(url);
      reason ? onFail?.(url, reason) : onReady?.(url);
      startNext();                         // pull another from queue
    };

    const t = setTimeout(() => {
      abort.abort();
      clear('timeout');
    }, timeoutMs);

    video.addEventListener('loadedmetadata', () => {
      clearTimeout(t);
      clear();                             // success
    });

    video.addEventListener('error', () => {
      clearTimeout(t);
      if (attempt < 2) {
        // simple retry with back-off
        setTimeout(() => loadOne(url, attempt + 1), 2000 * attempt);
      } else {
        clear('error');
      }
    });

    // start download
    video.load();
  }
}
