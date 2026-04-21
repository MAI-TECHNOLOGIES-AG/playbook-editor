import { useCallback, useEffect, useRef, useState } from "react";

/** After the last `patch` call, wait this long before pushing the pre-burst snapshot to history. */
const TEXT_PATCH_DEBOUNCE_MS = 500;

export type UndoHistory<T> = {
  past: T[];
  present: T | null;
  future: T[];
};

type SetArg<T> = T | null | ((prev: T | null) => T | null);

export function useUndoableState<T>(maxSteps: number) {
  const [h, setH] = useState<UndoHistory<T>>({
    past: [],
    present: null,
    future: [],
  });

  const hRef = useRef(h);
  hRef.current = h;

  const pendingRef = useRef<{
    snapshot: T;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const flush = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    const snap = p.snapshot;
    setH((s) => ({
      ...s,
      past: [...s.past, snap].slice(-maxSteps),
      future: [],
    }));
  }, [maxSteps]);

  const set = useCallback(
    (update: SetArg<T>) => {
      flush();
      setH((s) => {
        const prev = s.present;
        const next =
          typeof update === "function"
            ? (update as (p: T | null) => T | null)(prev)
            : update;
        if (next === prev) return s;
        const newPast =
          prev != null ? [...s.past, prev].slice(-maxSteps) : s.past;
        return { past: newPast, present: next, future: [] };
      });
    },
    [flush, maxSteps],
  );

  const patch = useCallback(
    (update: SetArg<T>) => {
      const currentPresent = hRef.current.present;
      const nextPreview =
        typeof update === "function"
          ? (update as (p: T | null) => T | null)(currentPresent)
          : update;
      if (nextPreview === currentPresent) return;

      if (currentPresent == null) {
        set(update);
        return;
      }

      if (!pendingRef.current) {
        const timer = setTimeout(flush, TEXT_PATCH_DEBOUNCE_MS);
        pendingRef.current = { snapshot: currentPresent, timer };
      } else {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current.timer = setTimeout(flush, TEXT_PATCH_DEBOUNCE_MS);
      }

      setH((s) => {
        const prev = s.present;
        const next =
          typeof update === "function"
            ? (update as (p: T | null) => T | null)(prev)
            : update;
        if (next === prev) return s;
        return { ...s, present: next };
      });
    },
    [flush, set],
  );

  const restore = useCallback((next: UndoHistory<T>) => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
    setH(next);
  }, []);

  const undo = useCallback(() => {
    flush();
    setH((s) => {
      if (s.past.length === 0 || s.present === null) return s;
      const popped = s.past[s.past.length - 1];
      const newPast = s.past.slice(0, -1);
      return {
        past: newPast,
        present: popped,
        future: [s.present, ...s.future],
      };
    });
  }, [flush]);

  const redo = useCallback(() => {
    flush();
    setH((s) => {
      if (s.future.length === 0) return s;
      const [head, ...rest] = s.future;
      const newPast =
        s.present != null
          ? [...s.past, s.present].slice(-maxSteps)
          : s.past;
      return {
        past: newPast,
        present: head,
        future: rest,
      };
    });
  }, [flush, maxSteps]);

  const canUndo = h.past.length > 0 && h.present !== null;
  const canRedo = h.future.length > 0;

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current = null;
      }
    };
  }, []);

  return [
    h.present,
    set,
    {
      undo,
      redo,
      canUndo,
      canRedo,
      restore,
      history: h,
      patch,
      flush,
    },
  ] as const;
}
