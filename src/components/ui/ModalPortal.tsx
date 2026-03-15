"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  /** When true, children are rendered into document.body. When false, nothing is rendered. */
  isOpen: boolean;
  /** Modal content (overlay + card). Rendered as a direct child of body when isOpen. */
  children: React.ReactNode;
}

/**
 * Portals modal content to document.body so that position:fixed is always
 * relative to the viewport and no ancestor (e.g. main with overflow-y-auto)
 * can affect modal positioning or cause it to drift.
 */
export function ModalPortal({ isOpen, children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;
  if (!isOpen) return null;

  return createPortal(children, document.body);
}
