/**
 * Calls `onChange` when devicePixelRatio changes: page zoom, or a window moved
 * to a display with another density. Neither resizes the element, so canvas
 * owners cannot rely on ResizeObserver to rebuild their backing store.
 * Returns a function that stops watching.
 */
export function observeDensity(onChange) {
  let media = null;
  const changed = () => { arm(); onChange(); };
  const arm = () => {
    media = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    media.addEventListener('change', changed, { once: true });
  };
  arm();
  return () => { media?.removeEventListener('change', changed); media = null; };
}
