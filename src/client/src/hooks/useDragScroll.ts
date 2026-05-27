import { useCallback, useEffect, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  // Навешиваем mousemove/mouseup на document — события не теряются при быстром движении мыши
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!state.current.active) return;
      const el = ref.current;
      if (!el) return;
      const dx = e.pageX - state.current.startX;
      if (Math.abs(dx) > 3) state.current.moved = true;
      el.scrollLeft = state.current.scrollLeft - dx;
    };

    const onUp = () => {
      if (!state.current.active) return;
      state.current.active = false;
      const el = ref.current;
      if (el) {
        el.classList.remove('is-dragging');
        el.style.scrollSnapType = '';

        // Если было движение — перехватываем следующий click в capture-фазе,
        // до того как React Router обработает его на <Link>
        if (state.current.moved) {
          const blockClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          };
          el.addEventListener('click', blockClick, { capture: true, once: true });
        }
      }
      setTimeout(() => { state.current.moved = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onMouseDown = useCallback((e: ReactMouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    state.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
    el.classList.add('is-dragging');
    // Отключаем snap на время drag, чтобы скролл был свободным
    el.style.scrollSnapType = 'none';
  }, []);

  const onDragStart = useCallback((e: DragEvent<T>) => {
    e.preventDefault();
  }, []);

  return {
    ref,
    dragScrollProps: { onMouseDown, onDragStart },
  };
}
