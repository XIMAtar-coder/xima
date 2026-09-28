/**
 * The 3D XIMAtar on a canvas. Loaded on demand (three.js is a large chunk):
 * the pages import it through Ximatar3D, never directly.
 *
 * Modes: 'sway' (landing: turns gently left and right), 'reveal' (result:
 * arrives from behind, turns to face you, then sways), 'spin'. The reader
 * can always drag to turn it; prefers-reduced-motion keeps it still.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Ximatar3DMode = 'sway' | 'reveal' | 'spin';

export interface Ximatar3DHandle {
  replay: () => void;
  dispose: () => void;
}

const cache = new Map<string, Promise<{ scene: THREE.Group; size: THREE.Vector3 }>>();

const loadModel = (url: string) => {
  if (!cache.has(url)) {
    cache.set(url, new GLTFLoader().loadAsync(url).then((gltf) => {
      const scene = gltf.scene;
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      scene.position.sub(box.getCenter(new THREE.Vector3()));
      return { scene, size };
    }));
  }
  return cache.get(url)!;
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export async function mountXimatar3D(canvas: HTMLCanvasElement, modelUrl: string, mode: Ximatar3DMode): Promise<Ximatar3DHandle> {
  const { scene: source, size } = await loadModel(modelUrl);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
  const pivot = new THREE.Group();
  pivot.add(source.clone(true));
  scene.add(pivot);
  const dist = (size.y / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.18;

  let t0 = performance.now();
  let dragYaw = 0;
  let drag: { x: number; yaw: number } | null = null;
  let paused = 0;
  let raf = 0;
  let alive = true;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onDown = (e: PointerEvent) => { drag = { x: e.clientX, yaw: dragYaw }; try { canvas.setPointerCapture(e.pointerId); } catch { /* capture unavailable */ } };
  const onMove = (e: PointerEvent) => { if (!drag) return; dragYaw = drag.yaw + (e.clientX - drag.x) * 0.012; paused = performance.now() + 3000; };
  const onUp = () => { drag = null; };
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const frame = (now: number) => {
    if (!alive) return;
    const s = (now - t0) / 1000;
    let yaw = 0;
    let zoom = 1;
    if (reduce) yaw = 0.3;
    else if (mode === 'reveal') {
      const k = ease(s / 2.4);
      yaw = Math.PI * (1 - k);
      zoom = 2.2 - 1.2 * k;
      if (s > 2.4) yaw = Math.sin((s - 2.4) * 0.55) * 0.6;
    } else if (mode === 'spin') yaw = s * 0.45;
    else yaw = Math.sin(s * 0.5) * 0.6;
    if (!drag && now > paused) dragYaw *= 0.94;
    pivot.rotation.y = yaw + dragYaw;
    camera.position.set(0, dist * 0.16 * zoom, dist * zoom);
    camera.lookAt(0, -size.y * 0.02, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  resize();
  raf = requestAnimationFrame(frame);

  return {
    replay: () => { t0 = performance.now(); dragYaw = 0; },
    dispose: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
