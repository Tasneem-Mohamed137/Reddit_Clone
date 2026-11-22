import { useEffect, useRef } from 'react';

// Attach the returned ref to an element at the end of the list; onReach fires when it nears the viewport.
export const useInfiniteScroll = (onReach, enabled) => {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onReach(), { rootMargin: '400px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onReach, enabled]);
  return ref;
};