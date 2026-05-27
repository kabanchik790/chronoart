import { useCallback, useEffect, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    lastX: 0,
    lastTime: 0,
    velocity: 0, // px/frame (нормализовано к 60fps)
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!state.current.active) return;
      const el = ref.current;
      if (!el) return;

      const now = performance.now();
      const dt = now - state.current.lastTime;
      const dx = e.pageX - state.current.startX;

      if (Math.abs(dx) > 3) state.current.moved = true;

      // Нормализуем к 60fps (16ms/frame), сглаживаем EMA 50/50
      if (dt > 0) {
        const raw = (state.current.lastX - e.pageX) / dt * 16;
        state.current.velocity = state.current.velocity * 0.5 + raw * 0.5;
      }
      state.current.lastX = e.pageX;
      state.current.lastTime = now;

      el.scrollLeft = state.current.scrollLeft - dx;
    };

    const onUp = () => {
      if (!state.current.active) return;
      state.current.active = false;
      const el = ref.current;
      if (!el) return;

      el.classList.remove('is-dragging');

      if (state.current.moved) {
        // Блокируем клик на дочерних ссылках (capture-фаза, до React Router)
        const blockClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        el.addEventListener('click', blockClick, { capture: true, once: true });

        // Инерция с трением — snap восстановится только когда скорость затухнет
        let v = state.current.velocity;
        const friction = 0.92;

        const animate = () => {
          if (Math.abs(v) < 0.5) {
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

    // Прерываем текущую инерцию
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
      lastTime: performance.now(),
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
