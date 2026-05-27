import { useCallback, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((event: ReactMouseEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    // Блокируем нативный drag браузера (иначе тащит ссылку вместо прокрутки)
    event.preventDefault();
    dragState.current = {
      isDragging: true,
      startX: event.pageX - element.offsetLeft,
      scrollLeft: element.scrollLeft,
    };
    element.classList.add('is-dragging');
  }, []);

  const stopDragging = useCallback(() => {
    dragState.current.isDragging = false;
    ref.current?.classList.remove('is-dragging');
  }, []);

  const onMouseMove = useCallback((event: ReactMouseEvent<T>) => {
    const element = ref.current;
    if (!element || !dragState.current.isDragging) return;
    const x = event.pageX - element.offsetLeft;
    element.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  }, []);

  // Блокируем системный dragstart на вложенных ссылках и картинках
  const onDragStart = useCallback((event: DragEvent<T>) => {
    event.preventDefault();
  }, []);

  return {
    ref,
    dragScrollProps: {
      onMouseDown,
      onMouseLeave: stopDragging,
      onMouseUp: stopDragging,
      onMouseMove,
      onDragStart,
    },
  };
}
