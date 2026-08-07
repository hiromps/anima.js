/**
 * Media picked in the playground's "files" control. ControlValue is
 * scalar-only, so the list travels through the store as a JSON string;
 * these helpers are the single (de)serialization point.
 */
export type UploadedMedia = {
  /** Object URL — session-scoped; codegen must never emit it. */
  src: string;
  name: string;
  kind: "image" | "video";
};

export function parseUploads(value: unknown): UploadedMedia[] {
  if (typeof value !== "string" || value === "") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is UploadedMedia =>
        u != null &&
        typeof u === "object" &&
        typeof (u as UploadedMedia).src === "string" &&
        typeof (u as UploadedMedia).name === "string" &&
        ((u as UploadedMedia).kind === "image" ||
          (u as UploadedMedia).kind === "video"),
    );
  } catch {
    return [];
  }
}

export function serializeUploads(list: UploadedMedia[]): string {
  return JSON.stringify(list);
}

/**
 * Releases the object URLs behind a serialized list. Call this wherever an
 * uploads value is discarded, otherwise the blobs stay alive for the tab's
 * lifetime with nothing referencing them.
 */
export function revokeUploads(value: unknown): void {
  for (const upload of parseUploads(value)) URL.revokeObjectURL(upload.src);
}
