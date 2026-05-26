import { useCallback, useRef, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });

  const onMouseDown = useCallback((event: ReactMouseEvent<T>) => {
    const element = ref.current;
    if (!element) {
      return;
    }

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
    if (!element || !dragState.current.isDragging) {
      return;
    }

    event.preventDefault();
    const x = event.pageX - element.offsetLeft;
    element.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  }, []);

  const onTouchStart = useCallback((event: ReactTouchEvent<T>) => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const touch = event.touches[0];
    dragState.current = {
      isDragging: true,
      startX: touch.pageX - element.offsetLeft,
      scrollLeft: element.scrollLeft,
    };
  }, []);

  const onTouchMove = useCallback((event: ReactTouchEvent<T>) => {
    const element = ref.current;
    if (!element || !dragState.current.isDragging) {
      return;
    }

    const touch = event.touches[0];
    const x = touch.pageX - element.offsetLeft;
    element.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  }, []);

  const onTouchEnd = useCallback(() => {
    dragState.current.isDragging = false;
  }, []);

  return {
    ref,
    dragScrollProps: {
      onMouseDown,
      onMouseLeave: stopDragging,
      onMouseUp: stopDragging,
      onMouseMove,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
