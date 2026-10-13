import { Buffer as BufferPolyfill } from "buffer";

// Ensure global Buffer is fully equipped with alloc, allocUnsafe, from, concat, isBuffer, byteLength etc.
// across Edge, SSR, Node, and browser runtimes.
if (typeof globalThis !== "undefined") {
  (globalThis as any).Buffer = BufferPolyfill;
  if (!(globalThis as any).global) {
    (globalThis as any).global = globalThis;
  }
}

if (typeof window !== "undefined") {
  (window as any).Buffer = BufferPolyfill;
  if (!(window as any).global) {
    (window as any).global = window;
  }
}

export { BufferPolyfill as Buffer };
