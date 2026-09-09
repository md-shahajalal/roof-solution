import { ESTIMATE_FORM } from './site.config';

/** Ceiling on the `<img>` fallback, so a silent decoder cannot stall the form. */
const DECODE_TIMEOUT_MS = 8000;

/** What a canvas will accept as a source, whichever decoder produced it. */
type Decoded = { source: CanvasImageSource; width: number; height: number; release(): void };

/**
 * Downscales a photo in the browser before it is attached to an email.
 *
 * Every free form backend caps attachments at around 10 MB for the whole
 * submission, and a single photo off a modern phone is 3–8 MB. Sending the
 * originals would mean two photos per enquiry at best. Re-encoding to a
 * 1600px JPEG brings each one to roughly 300–500 KB, which is both well inside
 * the cap and still enough resolution to see a lifted shingle or a rusted
 * flashing — the reason the photo was taken.
 *
 * Every failure path returns the original file rather than throwing. A photo
 * that could not be shrunk is still worth sending; the caller enforces the size
 * ceiling afterwards either way, and compares identity to tell whether the file
 * it got back was actually re-encoded.
 */
export async function compressImage(
  file: File,
  maxEdge: number = ESTIMATE_FORM.compress.maxEdge,
  quality: number = ESTIMATE_FORM.compress.quality,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Re-encoding an animated GIF would flatten it to one frame, and SVG has no
  // meaningful pixel size to reduce.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  const decoded = await decode(file);
  if (!decoded) return file;

  try {
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    // A small or already-optimised image can come out of the JPEG encoder
    // bigger than it went in. Keep whichever is smaller.
    if (blob.size >= file.size) return file;

    return new File([blob], toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    decoded.release();
  }
}

/**
 * Turns the file into something drawable, by whichever route works.
 *
 * `createImageBitmap` is the good path: it is off the main thread and it applies
 * the EXIF rotation, without which photos taken in portrait arrive on their
 * side. But it refuses formats the browser cannot decode natively — an iPhone
 * HEIC on a desktop browser being the common one — and refusing there used to
 * mean the original multi-megabyte file went out untouched, which then ate the
 * whole attachment budget and pushed every later photo out of the request.
 *
 * So there is a second attempt through an `<img>`, which accepts anything the
 * browser can render at all. Orientation handling is the browser's default there
 * rather than something requested explicitly, so a rotated photo is possible on
 * an older engine — an acceptable trade against dropping the photo entirely.
 */
async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      /* fall through to the <img> route */
    }
  }

  if (typeof URL.createObjectURL !== 'function' || typeof Image !== 'function') return null;

  let url: string;
  try {
    url = URL.createObjectURL(file);
  } catch {
    return null;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('decode failed'));
      // A decoder that answers with neither event would otherwise leave this
      // promise pending forever, and with it the visitor's upload spinner.
      timer = setTimeout(() => reject(new Error('decode timed out')), DECODE_TIMEOUT_MS);
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('empty image');

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** `roof damage.HEIC` becomes `roof damage.jpg`, since the bytes are now JPEG. */
function toJpegName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, '') || 'photo'}.jpg`;
}
