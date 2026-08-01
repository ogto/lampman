export async function readResponseBuffer(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("INVALID_RESPONSE_SIZE_LIMIT");
  }

  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new Error("RESPONSE_BODY_TOO_LARGE");
  }
  if (!response.body) throw new Error("RESPONSE_BODY_MISSING");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let reachedEnd = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        reachedEnd = true;
        break;
      }
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) throw new Error("RESPONSE_BODY_TOO_LARGE");

      // Vercel may expose fetch chunks backed by SharedArrayBuffer. Sharp rejects
      // that backing store, so copy every chunk into ordinary Node Buffer memory.
      const copy = Buffer.allocUnsafe(value.byteLength);
      copy.set(value);
      chunks.push(copy);
    }
  } finally {
    if (!reachedEnd) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  if (totalBytes === 0) throw new Error("RESPONSE_BODY_EMPTY");
  return Buffer.concat(chunks, totalBytes);
}
