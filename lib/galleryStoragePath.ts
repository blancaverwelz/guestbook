/**
 * useGalleryUpload.ts stores objects at `${eventId}/${id}.webp` /
 * `${eventId}/${id}-thumb.webp` in the "gallery" bucket, then saves
 * `getPublicUrl()`'s output (not the path) to `gallery.image_url` /
 * `thumbnail_url`. Admin delete needs the *path* back, since
 * `storage.from("gallery").remove()` takes paths, not public URLs.
 *
 * Public URLs from Supabase Storage always look like
 * `<project>/storage/v1/object/public/<bucket>/<path>`. Parse against that
 * fixed shape rather than guessing from string position, so a differently
 * configured project (custom domain, different bucket name) fails loudly
 * (returns null → caller shows an error) instead of silently deleting the
 * wrong object.
 */
export function galleryStoragePathFromUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/gallery/";
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length);
  return path.length > 0 ? decodeURIComponent(path) : null;
}
