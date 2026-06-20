/**
 * Client-side image downscale + (re)encode before upload to Supabase Storage.
 *
 * - SVG → passthrough (no canvas transform possible).
 * - Otherwise: respects EXIF orientation via `createImageBitmap(file, { imageOrientation: 'from-image' })`
 *   so smartphone photos don't get rotated. Falls back to <img> draw if not supported.
 * - Resizes to a max long-side, encodes to WebP (q=0.8). Falls back to JPEG if WebP unsupported.
 * - Returns a File with the new extension, preserving the original base name.
 */
export interface PrepareImageOptions {
  /** Max long side in pixels. Default 512. */
  longSide?: number;
  /** WebP quality 0..1. Default 0.8. */
  quality?: number;
}

export interface PreparedImage {
  file: File;
  ext: 'webp' | 'jpg' | 'svg' | string;
  width: number;
  height: number;
  originalSize: number;
  size: number;
}

const supportsWebpEncoding = (() => {
  let cached: boolean | null = null;
  return (): boolean => {
    if (cached !== null) return cached;
    try {
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      const url = c.toDataURL('image/webp');
      cached = typeof url === 'string' && url.startsWith('data:image/webp');
    } catch {
      cached = false;
    }
    return cached!;
  };
})();

async function decodeToBitmap(file: File): Promise<{ bitmap: ImageBitmap | HTMLImageElement; width: number; height: number; usedFallback: boolean }> {
  // Preferred path: createImageBitmap honours EXIF orientation
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { bitmap, width: bitmap.width, height: bitmap.height, usedFallback: false };
    } catch {
      // fall through to <img> fallback
    }
  }

  // Fallback: <img> decode — note: this does NOT correct EXIF orientation, but
  // most modern browsers auto-rotate via the image-orientation CSS default of
  // 'from-image' for img elements as of the latest spec.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { bitmap: img, width: img.naturalWidth, height: img.naturalHeight, usedFallback: true };
  } finally {
    // The URL will be revoked by the caller after drawing; keep alive here.
    // We can't revoke now because Safari may still need it during draw.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function fitDimensions(w: number, h: number, longSide: number): { width: number; height: number } {
  const max = Math.max(w, h);
  if (max <= longSide) return { width: w, height: h };
  const scale = longSide / max;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function basename(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export async function prepareImageForUpload(file: File, opts: PrepareImageOptions = {}): Promise<PreparedImage> {
  const longSide = opts.longSide ?? 512;
  const quality = opts.quality ?? 0.8;

  // SVG passthrough
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return {
      file,
      ext: 'svg',
      width: 0,
      height: 0,
      originalSize: file.size,
      size: file.size,
    };
  }

  const { bitmap, width: srcW, height: srcH } = await decodeToBitmap(file);
  const { width, height } = fitDimensions(srcW, srcH, longSide);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Browser without canvas 2d — return original
    return {
      file,
      ext: (file.name.split('.').pop() || 'jpg').toLowerCase(),
      width: srcW,
      height: srcH,
      originalSize: file.size,
      size: file.size,
    };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // ImageBitmap and HTMLImageElement are both valid drawImage sources
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  try {
    if ((bitmap as ImageBitmap).close) {
      (bitmap as ImageBitmap).close();
    }
  } catch { /* noop */ }

  const useWebp = supportsWebpEncoding();
  const mime = useWebp ? 'image/webp' : 'image/jpeg';
  const ext: 'webp' | 'jpg' = useWebp ? 'webp' : 'jpg';

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      mime,
      quality,
    );
  });

  const newName = `${basename(file.name)}.${ext}`;
  const out = new File([blob], newName, { type: mime, lastModified: Date.now() });

  return {
    file: out,
    ext,
    width,
    height,
    originalSize: file.size,
    size: out.size,
  };
}
