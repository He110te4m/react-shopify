export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let last = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  }) as T;
}
