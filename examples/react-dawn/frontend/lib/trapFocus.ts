function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

let handlers: { focusin?: (e: FocusEvent) => void; focusout?: () => void; keydown?: (e: KeyboardEvent) => void } = {};

export function trapFocus(container: HTMLElement, elementToFocus: HTMLElement = container): void {
  const elements = getFocusableElements(container);
  const first = elements[0];
  const last = elements[elements.length - 1];

  removeTrapFocus();

  handlers.focusin = (event: FocusEvent) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;
    document.addEventListener("keydown", handlers.keydown!);
  };

  handlers.focusout = () => {
    document.removeEventListener("keydown", handlers.keydown!);
  };

  handlers.keydown = (event: KeyboardEvent) => {
    if (event.code !== "Tab") return;
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener("focusout", handlers.focusout);
  document.addEventListener("focusin", handlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus instanceof HTMLInputElement &&
    ["search", "text", "email", "url"].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

export function removeTrapFocus(elementToFocus: HTMLElement | null = null): void {
  document.removeEventListener("focusin", handlers.focusin!);
  document.removeEventListener("focusout", handlers.focusout!);
  document.removeEventListener("keydown", handlers.keydown!);
  handlers = {};
  if (elementToFocus) elementToFocus.focus();
}

export function onKeyUpEscape(event: KeyboardEvent): void {
  if (event.code !== "Escape") return;
  const target = event.target as HTMLElement;
  const openDetailsElement = target.closest<HTMLElement>("details[open]");
  if (!openDetailsElement) return;
  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open");
  if (summaryElement) {
    summaryElement.setAttribute("aria-expanded", "false");
    summaryElement.focus();
  }
}
