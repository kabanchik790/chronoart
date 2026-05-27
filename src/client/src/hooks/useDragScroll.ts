import { useCallback, useEffect, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    lastX: 0,
    velocity: 0,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!state.current.active) return;
      const el = ref.current;
      if (!el) return;

      const dx = e.pageX - state.current.startX;
      if (Math.abs(dx) > 3) state.current.moved = true;

      // Скорость = смещение за один mousemove (в пикселях)
      state.current.velocity = state.current.lastX - e.pageX;
      state.current.lastX = e.pageX;

      el.scrollLeft = state.current.scrollLeft - dx;
    };

    const onUp = () => {
      if (!state.current.active) return;
      state.current.active = false;
      const el = ref.current;
      if (!el) return;

      el.classList.remove('is-dragging');

      if (state.current.moved) {
        // Блокируем click на дочерних ссылках в capture-фазе
        const blockClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        };
        el.addEventListener('click', blockClick, { capture: true, once: true });

        // Инерция: затухающий скролл через rAF
        let v = state.current.velocity * 8; // амплитуда
        const friction = 0.88;

        const animate = () => {
          if (Math.abs(v) < 0.5) {
            // Инерция затухла — включаем snap обратно
            el.style.scrollSnapType = '';
            rafRef.current = null;
            return;
          }
          el.scrollLeft += v;
          v *= friction;
          rafRef.current = requestAnimationFrame(animate);
        };

        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animate);
      } else {
        el.style.scrollSnapType = '';
      }

      setTimeout(() => { state.current.moved = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onMouseDown = useCallback((e: ReactMouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;

    // Прерываем текущую инерцию, если есть
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    state.current = {
      active: true,
      startX: e.pageX,
      scrollLeft: el.scrollLeft,
      moved: false,
      lastX: e.pageX,
      velocity: 0,
    };
    el.classList.add('is-dragging');
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
