import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '@/components/motion';
import { cssVar } from '@/lib/utils';

type Params = {
  speed: number;
  intensity: number;
  scale: number;
  pointerLerp: number;
};

const DEFAULTS: Params = {
  speed: 0.85,
  intensity: 1.15,
  scale: 2.4,
  pointerLerp: 0.06,
};

const ALPHA_DARK = 0.5;
const ALPHA_LIGHT = 0.085;

const FALLBACK_HUES: Record<string, [number, number, number]> = {
  '--h-azure': [96, 148, 255],
  '--h-iris': [142, 115, 255],
  '--h-aqua': [34, 199, 194],
};

function hueVec(name: string): THREE.Vector3 {
  const raw = cssVar(name);
  const parts = raw.split(/[\s,/]+/).filter((s) => s.length > 0).map(Number);
  const ok = parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n));
  const [r, g, b] = ok ? (parts as number[]) : FALLBACK_HUES[name] ?? [96, 148, 255];
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

function isLightTheme(): boolean {
  if (typeof document === 'undefined') return false;
  return !document.documentElement.classList.contains('dark');
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uHueAzure;
  uniform vec3 uHueIris;
  uniform vec3 uHueAqua;
  uniform float uAlpha;
  uniform float uScale;
  uniform float uIntensity;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float t = uTime * 0.35;

    float n1 = fbm(uv * uScale + vec2(t * 0.2, -t * 0.1));
    float n2 = fbm(uv * (uScale * 1.5) - vec2(n1 * 1.2, t * 0.3));

    float filament = abs(sin(uv.y * 3.0 + n2 * 4.0 + t * 0.5));
    filament = 0.02 / max(filament, 0.008);

    vec3 col = mix(uHueAzure, uHueIris, clamp(n1 * 1.5, 0.0, 1.0));
    col = mix(col, uHueAqua, clamp(n2 * 0.8, 0.0, 1.0));

    float alpha = filament * uIntensity * uAlpha;
    gl_FragColor = vec4(col * filament, clamp(alpha, 0.0, 1.0));
  }
`;

export function Lightning() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uHueAzure: { value: hueVec('--h-azure') },
      uHueIris: { value: hueVec('--h-iris') },
      uHueAqua: { value: hueVec('--h-aqua') },
      uAlpha: { value: isLightTheme() ? ALPHA_LIGHT : ALPHA_DARK },
      uScale: { value: DEFAULTS.scale },
      uIntensity: { value: DEFAULTS.intensity },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let reqId: number;
    let clock = new THREE.Clock();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
      uniforms.uHueAzure.value = hueVec('--h-azure');
      uniforms.uHueIris.value = hueVec('--h-iris');
      uniforms.uHueAqua.value = hueVec('--h-aqua');
      uniforms.uAlpha.value = isLightTheme() ? ALPHA_LIGHT : ALPHA_DARK;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime() * DEFAULTS.speed;
      renderer.render(scene, camera);
      reqId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60"
    />
  );
}
