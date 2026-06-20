import * as React from 'react';
import { cn } from '@/lib/utils';
import { buildImageUrl } from '@/lib/images/buildImageUrl';

export interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading'> {
  /** Resolved image URL. Use this OR (bucket + path). */
  src?: string | null;
  /** Supabase bucket name (alternative to `src`). */
  bucket?: string;
  /** Object path within the bucket (alternative to `src`). */
  path?: string | null;
  /** Optional cache-buster appended when building from bucket/path. */
  cacheBust?: string | number | null;
  /** Intrinsic display width in CSS px. REQUIRED to avoid layout shift. */
  width: number;
  /** Intrinsic display height in CSS px. REQUIRED to avoid layout shift. */
  height: number;
  /** When true: eager + fetchpriority="high" (above-the-fold heroes only). */
  priority?: boolean;
  /** object-fit class. Default 'cover'. */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Rendered when no src or when img errors. */
  fallback?: React.ReactNode;
  /** Class applied to the wrapper element (controls size, border-radius, etc.). */
  className?: string;
  /** Class applied directly to the <img>. */
  imgClassName?: string;
}

/**
 * <OptimizedImage> — drop-in for `<img>` with skeleton, fallback, lazy loading
 * and explicit intrinsic dimensions (no CLS).
 *
 * Image transformation (resize/quality) is NOT performed: Supabase Storage
 * image transformations are not enabled on this project. Real size reduction
 * happens at UPLOAD time via prepareImageForUpload(). This component focuses
 * on delivery hints (lazy/eager, decoding, cache, fallback).
 */
export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  function OptimizedImage(
    {
      src,
      bucket,
      path,
      cacheBust,
      width,
      height,
      priority = false,
      objectFit = 'cover',
      fallback,
      className,
      imgClassName,
      alt,
      onLoad,
      onError,
      ...rest
    },
    ref,
  ) {
    const resolved = React.useMemo(() => {
      if (src) return src;
      if (bucket && path) return buildImageUrl({ bucket, path, cacheBust });
      return null;
    }, [src, bucket, path, cacheBust]);

    const [loaded, setLoaded] = React.useState(false);
    const [errored, setErrored] = React.useState(false);

    React.useEffect(() => {
      setLoaded(false);
      setErrored(false);
    }, [resolved]);

    const objectFitClass = {
      cover: 'object-cover',
      contain: 'object-contain',
      fill: 'object-fill',
      none: 'object-none',
      'scale-down': 'object-scale-down',
    }[objectFit];

    const showFallback = !resolved || errored;

    return (
      <span
        className={cn('relative inline-block overflow-hidden', className)}
        style={{ width, height }}
      >
        {!showFallback && !loaded && (
          <span
            aria-hidden
            className="absolute inset-0 bg-muted animate-pulse"
          />
        )}
        {showFallback ? (
          <span className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            {fallback ?? null}
          </span>
        ) : (
          <img
            ref={ref}
            src={resolved!}
            alt={alt ?? ''}
            width={width}
            height={height}
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            // @ts-expect-error fetchpriority is valid HTML, not yet typed
            fetchpriority={priority ? 'high' : undefined}
            draggable={false}
            onLoad={(e) => {
              setLoaded(true);
              onLoad?.(e);
            }}
            onError={(e) => {
              setErrored(true);
              onError?.(e);
            }}
            className={cn(
              'w-full h-full transition-opacity duration-200',
              objectFitClass,
              loaded ? 'opacity-100' : 'opacity-0',
              imgClassName,
            )}
            {...rest}
          />
        )}
      </span>
    );
  },
);
