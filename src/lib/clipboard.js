"use client";

import { useCallback, useState } from "react";

/**
 * Copies a string of text to the user's clipboard.
 * Safe for server-side rendering and legacy fallback.
 *
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function copyToClipboard(text) {
  if (!text || typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch (_e) {
    // Clipboard write blocked or unsupported
  }
  return false;
}

/**
 * React hook to manage copying with temporary visual feedback for an ID or key.
 *
 * @param {number} [duration=1800] - Duration in ms to display active copied state
 * @returns {{
 *   copiedId: string | null,
 *   handleCopy: (text: string, id: string) => Promise<boolean>,
 *   setCopiedId: (id: string | null) => void,
 * }}
 */
export function useClipboard(duration = 1800) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = useCallback(
    async (text, id) => {
      const success = await copyToClipboard(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), duration);
      }
      return success;
    },
    [duration],
  );

  return { copiedId, handleCopy, setCopiedId };
}
