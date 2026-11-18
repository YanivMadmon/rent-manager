// Phone photos are often 3-5MB; uploading them as-is makes every upload and
// every thumbnail slow on a mobile connection. Before upload, an image is
// scaled down to fit MAX_SIDE and re-encoded as JPEG. Anything else (a PDF, a
// Word file) or an image that's already small is returned untouched.

const MAX_SIDE = 1600;
const QUALITY = 0.82;
const SMALL_ENOUGH = 400 * 1024;

export async function resizeImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= SMALL_ENOUGH) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no transparency: paint a white backdrop for PNG screenshots.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    // An image the browser can't decode is uploaded as it is.
    return file;
  }
}
