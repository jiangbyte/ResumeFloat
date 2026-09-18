import { useRef, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const DBLCLICK_MS = 320;

/**
 * Custom titlebar drag without `data-tauri-drag-region`,
 * so OS/Tauri won't toggle maximize on double-click.
 */
export function useTitlebarDrag() {
  const lastDownAt = useRef(0);

  function onMouseDown(e: MouseEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest(".titlebar-actions")) return;

    const now = Date.now();
    const isDouble = now - lastDownAt.current < DBLCLICK_MS;
    lastDownAt.current = now;

    if (isDouble) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    void getCurrentWindow().startDragging();
  }

  function onDoubleClick(e: MouseEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  return { onMouseDown, onDoubleClick };
}
