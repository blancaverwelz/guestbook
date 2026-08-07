import imageCompression from "browser-image-compression";

const FULL_MAX_DIMENSION = 1920;
const THUMBNAIL_MAX_DIMENSION = 400;
const FULL_MAX_SIZE_MB = 0.5;
const THUMBNAIL_MAX_SIZE_MB = 0.15;

export interface CompressedImage {
  full: Blob;
  thumbnail: Blob;
}

/**
 * Resizes + re-encodes an image to WebP at two sizes (full display size and
 * grid thumbnail). Pure function: File in, Blobs out — verify this in
 * isolation before wiring it into useGalleryUpload (playbook: verify the
 * data, not the render — check actual output byte size and dimensions of
 * `full`/`thumbnail`, don't just assume compression ran because no error
 * was thrown).
 *
 * EXIF handling: browser-image-compression re-encodes through a canvas,
 * which strips EXIF (including GPS location) as a side effect. It reads the
 * EXIF orientation tag internally first so the re-encoded image is rotated
 * correctly, then the tag itself is discarded along with the rest of the
 * EXIF block. Confirm this on a real compressed output with exiftool per
 * the Chat 4 success criteria — don't assume the library's behavior matches
 * this comment without checking.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  const baseOptions = {
    fileType: "image/webp",
    useWebWorker: true,
    initialQuality: 0.82,
  };

  const full = await imageCompression(file, {
    ...baseOptions,
    maxWidthOrHeight: FULL_MAX_DIMENSION,
    maxSizeMB: FULL_MAX_SIZE_MB,
  });

  const thumbnail = await imageCompression(file, {
    ...baseOptions,
    maxWidthOrHeight: THUMBNAIL_MAX_DIMENSION,
    maxSizeMB: THUMBNAIL_MAX_SIZE_MB,
  });

  return { full, thumbnail };
}
