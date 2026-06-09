export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  }) as T;
}
