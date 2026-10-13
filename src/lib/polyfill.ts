import { Buffer as BufferPolyfill } from "buffer";

// Ensure global Buffer is fully equipped with alloc, allocUnsafe, from, concat, isBuffer, byteLength etc.
// across Edge, SSR, Node, and browser runtimes.
if (typeof globalThis !== "undefined") {
  const g = globalThis as any;
  if (!g.Buffer || typeof g.Buffer.alloc !== "function") {
    g.Buffer = BufferPolyfill;
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  if (!w.Buffer || typeof w.Buffer.alloc !== "function") {
    w.Buffer = BufferPolyfill;
  }
}

export { BufferPolyfill as Buffer };
