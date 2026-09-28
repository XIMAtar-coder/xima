import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ximatar3DHandle, Ximatar3DMode } from '@/lib/ximatar3dEngine';

/** XIMAtars that already have a 3D model (public/models/<id>.glb and .usdz). */
export const XIMATAR_3D_MODELS: Record<string, { glb: string; usdz: string }> = {
  owl: { glb: '/models/owl.glb', usdz: '/models/owl.usdz' },
};

export const has3DModel = (id: string | null | undefined) => !!id && !!XIMATAR_3D_MODELS[id.toLowerCase()];

/** AR Quick Look (iPhone, iPad): true when the browser can open a USDZ in place. */
export const canOpenAR = () => {
  if (typeof document === 'undefined') return false;
  const a = document.createElement('a');
  return !!(a.relList && a.relList.supports && a.relList.supports('ar'));
};

/** Opens the XIMAtar on the table (AR Quick Look). Returns false where AR is not available. */
export const openXimatarAR = (id: string): boolean => {
  const model = XIMATAR_3D_MODELS[id.toLowerCase()];
  if (!model || !canOpenAR()) return false;
  const a = document.createElement('a');
  a.rel = 'ar';
  a.href = `${model.usdz}#allowsContentScaling=0`;
  a.appendChild(document.createElement('img'));
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
};

export interface Ximatar3DRef { replay: () => void }

interface Props {
  ximatarId: string;
  mode: Ximatar3DMode;
  /** The 2D emblem, shown while loading and wherever 3D is not available. */
  fallbackSrc: string;
  alt: string;
  className?: string;
}

/**
 * The XIMAtar in 3D when it has a model, otherwise its emblem. three.js is
 * loaded only here, on demand. WebGL failures fall back to the emblem.
 */
export const Ximatar3D = forwardRef<Ximatar3DRef, Props>(({ ximatarId, mode, fallbackSrc, alt, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<Ximatar3DHandle | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>(has3DModel(ximatarId) ? 'loading' : 'fallback');

  useImperativeHandle(ref, () => ({ replay: () => handleRef.current?.replay() }), []);

  useEffect(() => {
    const model = XIMATAR_3D_MODELS[ximatarId.toLowerCase()];
    if (!model || !canvasRef.current) { setState('fallback'); return; }
    let cancelled = false;
    setState('loading');
    import('@/lib/ximatar3dEngine')
      .then(({ mountXimatar3D }) => mountXimatar3D(canvasRef.current!, model.glb, mode))
      .then((handle) => {
        if (cancelled) { handle.dispose(); return; }
        handleRef.current = handle;
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('fallback'); });
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [ximatarId, mode]);

  return (
    <div className={`relative ${className ?? ''}`}>
      {state !== 'ready' && (
        <img
          src={fallbackSrc}
          alt={alt}
          className="absolute left-1/2 top-1/2 h-[62%] max-h-[260px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] object-contain"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={`block h-full w-full transition-opacity duration-500 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
});
Ximatar3D.displayName = 'Ximatar3D';

export default Ximatar3D;
