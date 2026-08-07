const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSION = /\.hei[cf]$/i;

/**
 * Detects HEIC/HEIF by mime type first, falling back to file extension.
 *
 * This fallback matters in practice: iOS Safari and some Android browsers
 * hand back an empty string or "application/octet-stream" for `file.type`
 * when a HEIC photo is picked from the library rather than the camera.
 * Trusting mime type alone would silently skip conversion for exactly the
 * files most likely to need it (playbook: HEIC fails silently in
 * canvas-based compression if not converted first).
 */
export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  if (type === "" || type === "application/octet-stream") {
    return HEIC_EXTENSION.test(file.name);
  }
  return false;
}

/**
 * Converts a HEIC/HEIF File to a JPEG File. Pure function: File in, File
 * out — verify this in isolation (e.g. a small Node/browser script feeding
 * it a real iPhone-exported .heic file and checking the output decodes)
 * before wiring it into useGalleryUpload.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamic import: heic2any loads a WASM HEIF decoder and touches
  // browser-only globals (Worker, etc). It must never be evaluated during
  // SSR/build — only inside a client-side call path.
  const heic2any = (await import("heic2any")).default;

  let result: Blob | Blob[];
  try {
    result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  } catch {
    throw new Error("Could not convert this photo. Please try a different one.");
  }

  // heic2any returns an array when the source HEIC container holds more
  // than one image (e.g. some Live Photo exports) — use the first frame.
  const blob = Array.isArray(result) ? result[0] : result;

  const newName = file.name.replace(HEIC_EXTENSION, ".jpg") || "photo.jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
