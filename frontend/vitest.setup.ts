import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver; cmdk (used by MultiSelect) requires it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Node 24's experimental global localStorage shadows jsdom's per-window implementation
// under Vitest, leaving both `localStorage` and `window.localStorage` undefined.
class LocalStorageStub implements Storage {
  #store = new Map<string, string>();
  get length() {
    return this.#store.size;
  }
  clear() {
    this.#store.clear();
  }
  getItem(key: string) {
    return this.#store.has(key) ? this.#store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.#store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.#store.delete(key);
  }
  setItem(key: string, value: string) {
    this.#store.set(key, String(value));
  }
}
if (!globalThis.localStorage) {
  globalThis.localStorage = new LocalStorageStub();
}

// jsdom doesn't implement scrollIntoView; cmdk (used by MultiSelect) calls it when the
// checked/selected item changes.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
