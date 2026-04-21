import { useCallback, useState } from "react";

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

  const set = useCallback(
    (update: SetArg<T>) => {
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
    [maxSteps],
  );

  const restore = useCallback((next: UndoHistory<T>) => {
    setH(next);
  }, []);

  const undo = useCallback(() => {
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
  }, []);

  const redo = useCallback(() => {
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
  }, [maxSteps]);

  const canUndo = h.past.length > 0 && h.present !== null;
  const canRedo = h.future.length > 0;

  return [h.present, set, { undo, redo, canUndo, canRedo, restore, history: h }] as const;
}
