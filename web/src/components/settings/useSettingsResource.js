"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAVED_BADGE_MS = 2500;

/**
 * Load → edit → save state for one settings section.
 * `load`, `save`, `toDraft` and `fromDraft` must be stable (module-level) functions.
 *
 * @param {{
 *   load: () => Promise<any>,
 *   save: (payload: any) => Promise<any>,
 *   toDraft: (data: any) => any,
 *   fromDraft: (draft: any) => any,
 * }} options
 */
export function useSettingsResource({ load, save, toDraft, fromDraft }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = useState(null);
  const savedTimer = useRef(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await load();
      setData(loaded);
      setDraft(toDraft(loaded));
    } catch (err) {
      setLoadError(err);
    }
  }, [load, toDraft]);

  useEffect(() => {
    reload();
    return () => clearTimeout(savedTimer.current);
  }, [reload]);

  const isDirty =
    data !== null && JSON.stringify(draft) !== JSON.stringify(toDraft(data));

  const submit = async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const saved = await save(fromDraft(draft));
      setData(saved);
      setDraft(toDraft(saved));
      setSaveState("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(
        () => setSaveState("idle"),
        SAVED_BADGE_MS,
      );
      return saved;
    } catch (err) {
      setSaveError(err);
      setSaveState("error");
      return null;
    }
  };

  const reset = () => setDraft(toDraft(data));

  return {
    data,
    draft,
    setDraft,
    loadError,
    isLoading: data === null && !loadError,
    isDirty,
    saveState,
    saveError,
    submit,
    reset,
    reload,
  };
}
