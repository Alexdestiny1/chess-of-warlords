/**
 * Cache-first fetch for the hall's remote assets (GLBs, scores, voices).
 * First play still needs the network; later launches can stand up the armies
 * from the Cache API even with the radio off.
 */
const CACHE_NAME = "mc-assets-v1";

export async function cachedArrayBuffer(url: string): Promise<ArrayBuffer> {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit?.ok) return hit.arrayBuffer();
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      try {
        await cache.put(url, response.clone());
      } catch {
        // Quota — play the bytes we already have.
      }
      return response.arrayBuffer();
    } catch (error) {
      const cache = await caches.open(CACHE_NAME).catch(() => null);
      const hit = cache ? await cache.match(url) : undefined;
      if (hit?.ok) return hit.arrayBuffer();
      throw error;
    }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.arrayBuffer();
}
