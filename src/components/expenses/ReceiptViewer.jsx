"use client";

import {
  ExternalLink,
  ImageOff,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Shows the original receipt (photo or PDF) as sent in by the worker.
 * Images can be zoomed and rotated, since WhatsApp photos are often sideways.
 */
export function ReceiptViewer({ url, contentType, alt, className }) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);

  const isPdf =
    contentType === "application/pdf" || /\.pdf($|\?)/i.test(url || "");

  const toolButtonClass =
    "size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none";

  if (!url || hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-8 opacity-60" />
        <p className="text-xs font-medium">Bonnetje kon niet geladen worden</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline"
          >
            Probeer in nieuw tabblad
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/70 bg-muted/30 overflow-hidden",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 border-b border-border/50 bg-card/80 px-2 py-1.5">
        <span className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Origineel bonnetje
        </span>
        <div className="flex items-center gap-0.5">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.5))}
                disabled={zoom <= MIN_ZOOM}
                className={toolButtonClass}
                title="Uitzoomen"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.5))}
                disabled={zoom >= MAX_ZOOM}
                className={toolButtonClass}
                title="Inzoomen"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className={toolButtonClass}
                title="Draaien"
              >
                <RotateCw className="size-4" />
              </button>
            </>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={toolButtonClass}
            title="Open in nieuw tabblad"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>

      {/* Receipt */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isPdf ? (
          <iframe
            src={url}
            title={alt}
            className="h-full min-h-[60vh] w-full bg-white"
          />
        ) : (
          <div className="flex min-h-full items-center justify-center p-3">
            {/* biome-ignore lint/performance/noImgElement: receipt is served by the backend, not optimizable by next/image */}
            <img
              src={url}
              alt={alt}
              onError={() => setHasError(true)}
              style={{
                transform: `rotate(${rotation}deg)`,
                width: `${zoom * 100}%`,
              }}
              className="max-w-none origin-center rounded-md shadow-sm transition-transform duration-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ReceiptViewer;
