import { useCallback, useRef, useState } from 'react';

/**
 * One-finger drag for the pauses.
 *
 * A pointer-down on a draggable starts tracking; the element follows the
 * finger through a CSS transform; on release the drop zone under the finger
 * (an ancestor with `data-drop-zone`) receives the item. A press without
 * movement is a tap: the item is "lifted", and the next tap on a zone drops
 * it there. So it works with a mouse, a finger, and for people who prefer
 * two taps to a drag.
 */

const TAP_TOLERANCE = 6;

export interface DragState { id: string | null; dx: number; dy: number; dragging: boolean }

export function useDragToZone(onDrop: (id: string, zone: string) => void) {
  const [state, setState] = useState<DragState>({ id: null, dx: 0, dy: 0, dragging: false });
  const [lifted, setLiftedState] = useState<string | null>(null);
  // The lifted item also lives in a ref: a zone tap can follow the lift
  // before React has re-rendered the closures.
  const liftedRef = useRef<string | null>(null);
  const setLifted = useCallback((v: string | null | ((cur: string | null) => string | null)) => {
    const next = typeof v === 'function' ? v(liftedRef.current) : v;
    liftedRef.current = next;
    setLiftedState(next);
  }, []);
  const start = useRef<{ id: string; x: number; y: number } | null>(null);

  const zoneAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const zone = el?.closest<HTMLElement>('[data-drop-zone]');
    return zone?.dataset.dropZone ?? null;
  };

  const onPointerDown = useCallback((id: string) => (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { id, x: e.clientX, y: e.clientY };
    setState({ id, dx: 0, dy: 0, dragging: false });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    const dragging = Math.hypot(dx, dy) > TAP_TOLERANCE;
    setState({ id: s.id, dx, dy, dragging });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_TOLERANCE;
    if (moved) {
      // The dragged element sits under the finger: look through it.
      const el = e.currentTarget as HTMLElement;
      const prev = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      const zone = zoneAt(e.clientX, e.clientY);
      el.style.pointerEvents = prev;
      if (zone) onDrop(s.id, zone);
      setLifted(null);
    } else {
      setLifted((cur) => (cur === s.id ? null : s.id));
    }
    setState({ id: null, dx: 0, dy: 0, dragging: false });
  }, [onDrop]);

  /** Tap on a zone while an item is lifted: drop it there. */
  const onZoneTap = useCallback((zone: string) => {
    const cur = liftedRef.current;
    if (!cur) return;
    onDrop(cur, zone);
    setLifted(null);
  }, [onDrop, setLifted]);

  const handlers = (id: string) => ({
    onPointerDown: onPointerDown(id), onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
    style: state.id === id && state.dragging
      ? { transform: `translate(${state.dx}px, ${state.dy}px)`, zIndex: 40, position: 'relative' as const, touchAction: 'none' as const }
      : { touchAction: 'none' as const },
  });

  return { state, lifted, setLifted, handlers, onZoneTap };
}
