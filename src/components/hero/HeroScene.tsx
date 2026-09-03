import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Environment, Float, Sparkles } from '@react-three/drei';
import { useScroll } from 'framer-motion';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '@/components/motion';

/**
 * Cinematic 3D hero — Stripe/Linear-grade composition.
 *
 * Shot: low-angle, off-centre camera looking up at the vehicle with
 * a 24mm-equivalent wide feel. Atmospheric haze, lens-flare billboards,
 * gradient sky wash, ground reflection, foreground props (road cones +
 * tire stack) for depth. Volumetric headlight beams cut through fog.
 *
 * Camera moves forward + tilts up as the user scrolls. Reduced-motion:
 * static frame, no bob, no animation.
 */
export function HeroScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  useEffect(() => {
    (window as unknown as { __heroScroll?: { current: number } }).__heroScroll = {
      get current() { return scrollYProgress.get(); },
    };
    return () => {
      delete (window as unknown as { __heroScroll?: unknown }).__heroScroll;
    };
  }, [scrollYProgress]);

  return (
    <div
      ref={sectionRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [4.2, 1.0, 6.5], fov: 38, near: 0.1, far: 200 }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#050608']} />
        <fog attach="fog" args={['#0a0c10', 6, 48]} />

        {/* Cinematic 3-point lighting */}
        <ambientLight intensity={0.18} />
        <hemisphereLight args={['#ffd8a0', '#0a0c10', 0.35]} />
        {/* Key — warm sun from upper-right */}
        <directionalLight position={[6, 9, 4]} intensity={1.6} color="#ffe2b0" />
        {/* Fill — cool bounce from camera-left */}
        <directionalLight position={[-4, 2, 5]} intensity={0.6} color="#9bbcff" />
        {/* Rim — back light to separate vehicle from fog */}
        <directionalLight position={[-3, 4, -6]} intensity={0.9} color="#ffae5a" />

        <Suspense fallback={null}>
          {!reduced && <Environment preset="night" />}

          {/* Gradient sky wash via huge inverted sphere with vertex colors */}
          <SkyWash />
          <Stars radius={70} depth={50} count={3500} factor={3.2} fade speed={0.4} />
          <Sparkles
            count={reduced ? 30 : 120}
            scale={[18, 6, 12]}
            position={[0, 3, 0]}
            size={2.2}
            speed={0.4}
            color="#ffd9a0"
            opacity={0.6}
          />

          <CitySilhouette />
          <MountainRing />
          <Ground />
          <ReflectiveRoad />
          <DustField count={reduced ? 40 : 280} />

          <Vehicle reduced={reduced} />
          <ForegroundProps reduced={reduced} />
          <BillboardFlare reduced={reduced} />

          <ScrollCamera reduced={reduced} />
        </Suspense>
      </Canvas>

      {/* CSS overlays: brand spotlight + vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_35%,rgba(232,177,74,0.22),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_100%,transparent_55%,#050608_100%)] opacity-75" />
      {/* Top brand gradient — animates gradient via conic + blur */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] opacity-50 blur-3xl"
           style={{ background: 'conic-gradient(from 90deg at 50% 50%, #e8b14a 0deg, transparent 120deg, #3b82f6 240deg, #e8b14a 360deg)' }}
      />
    </div>
  );
}

/* ──────────────────────────  Camera  ────────────────────────── */

function ScrollCamera({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const t = useRef({ x: 4.2, y: 1.0, z: 6.5, lookX: 0, lookY: 0.8, lookZ: -2 });

  useFrame(() => {
    if (reduced) {
      camera.position.set(4.2, 1.0, 6.5);
      camera.lookAt(0, 0.8, -2);
      return;
    }
    const w = window as unknown as { __heroScroll?: { current: number } };
    const p = w.__heroScroll?.current ?? 0;
    t.current.x = 4.2 - p * 1.6;
    t.current.y = 1.0 + p * 0.3;
    t.current.z = 6.5 - p * 4.0;
    t.current.lookY = 0.8 + p * 0.3;
    camera.position.x += (t.current.x - camera.position.x) * 0.08;
    camera.position.y += (t.current.y - camera.position.y) * 0.08;
    camera.position.z += (t.current.z - camera.position.z) * 0.08;
    camera.lookAt(t.current.lookX, t.current.lookY, t.current.lookZ);
  });
  return null;
}

/* ──────────────────────────  Sky  ────────────────────────── */

function SkyWash() {
  // A big inverted sphere with a vertical gradient — warm at the horizon,
  // deep blue-black overhead. No textures, all vertex color.
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(80, 32, 32);
    const colors: number[] = [];
    const top = new THREE.Color('#0a1024');
    const horizon = new THREE.Color('#1a2a4a');
    const bottom = new THREE.Color('#2a1810');
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 80;
      const c = new THREE.Color();
      if (y > 0) {
        c.copy(horizon).lerp(top, Math.min(1, y * 1.5));
      } else {
        c.copy(horizon).lerp(bottom, Math.min(1, -y * 1.5));
      }
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/* ──────────────────────────  Vehicle  ────────────────────────── */

function Vehicle({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(performance.now() / 4500) * 0.025;
    if (reduced) {
      ref.current.position.y = 0.4;
    } else {
      ref.current.position.y = 0.4 + Math.sin(performance.now() / 1200) * 0.045;
    }
  });

  return (
    <animated.group ref={ref} position={[0, 0.4, 0]} rotation={[0, 0.05, 0]}>
      {/* Body slab */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.7, 0.42, 3.4]} />
        <meshStandardMaterial color="#0d1115" metalness={0.85} roughness={0.28} />
      </mesh>
      {/* Lower body crease */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.74, 0.08, 3.42]} />
        <meshStandardMaterial color="#050608" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Cabin — glassier, with subtle blue tint */}
      <mesh position={[0, 0.6, -0.15]}>
        <boxGeometry args={[1.45, 0.5, 1.7]} />
        <meshStandardMaterial color="#1a2230" metalness={0.7} roughness={0.18} transparent opacity={0.94} />
      </mesh>
      {/* Cabin reflection band */}
      <mesh position={[0, 0.45, 0.7]}>
        <boxGeometry args={[1.47, 0.04, 0.04]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Hood crease */}
      <mesh position={[0, 0.45, 1.25]}>
        <boxGeometry args={[1.72, 0.05, 0.7]} />
        <meshStandardMaterial color="#050608" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Front grille */}
      <mesh position={[0, 0.2, 1.7]}>
        <boxGeometry args={[1.3, 0.2, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.4} />
      </mesh>
      {/* Wheels — slightly wider for drama */}
      {([
        [-0.85, 0,  1.05],
        [ 0.85, 0,  1.05],
        [-0.85, 0, -1.05],
        [ 0.85, 0, -1.05],
      ] as [number, number, number][]).map((p, i) => (
        <group key={i} position={p} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.36, 0.36, 0.3, 20]} />
            <meshStandardMaterial color="#080808" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.32, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Headlight bulbs */}
      <mesh position={[ 0.55, 0.22, 1.71]}>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial emissive="#fff5d8" emissiveIntensity={4} color="#fff5d8" />
      </mesh>
      <mesh position={[-0.55, 0.22, 1.71]}>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial emissive="#fff5d8" emissiveIntensity={4} color="#fff5d8" />
      </mesh>
      {/* Tail light strip */}
      <mesh position={[0, 0.32, -1.71]}>
        <boxGeometry args={[1.4, 0.06, 0.04]} />
        <meshStandardMaterial emissive="#ff3030" emissiveIntensity={2.5} color="#ff3030" />
      </mesh>
      {/* Volumetric headlight cones — bigger and brighter */}
      <Headlight side={1} />
      <Headlight side={-1} />
    </animated.group>
  );
}

function Headlight({ side }: { side: 1 | -1 }) {
  return (
    <mesh position={[side * 0.55, 0.22, 3.2]} rotation={[-Math.PI / 2 + 0.05, 0, side * 0.03]}>
      <coneGeometry args={[0.85, 6.5, 24, 1, true]} />
      <meshBasicMaterial
        color="#fff0c2"
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ──────────────────────────  Foreground props  ────────────────────────── */

function ForegroundProps({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && !reduced) {
      ref.current.rotation.y = Math.sin(performance.now() / 6000) * 0.03;
    }
  });
  return (
    <group ref={ref}>
      {/* Tire stack — left of camera */}
      <group position={[-2.2, 0, 1.8]}>
        {[0, 0.3, 0.6].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.12, 12, 24]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.4} roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* Traffic cone — right of camera */}
      <group position={[2.4, 0, 2.0]}>
        <mesh position={[0, 0.35, 0]}>
          <coneGeometry args={[0.18, 0.7, 14]} />
          <meshStandardMaterial color="#e8643a" emissive="#e8643a" emissiveIntensity={0.15} metalness={0.3} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.4, 0.04, 0.4]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* Reflective stripe */}
        <mesh position={[0, 0.45, 0]}>
          <torusGeometry args={[0.14, 0.02, 6, 14]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {/* Floating brand badge — small disc on a stick */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <group position={[-3.0, 1.4, 0.5]}>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 32]} />
            <meshStandardMaterial color="#e8b14a" emissive="#e8b14a" emissiveIntensity={0.4} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

/* ──────────────────────────  Lens flare billboard  ────────────────────────── */

function BillboardFlare({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t0 = useRef(performance.now());
  useFrame(() => {
    if (!ref.current) return;
    const t = (performance.now() - t0.current) / 1000;
    // Subtle pulse for the flare.
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = reduced ? 0.6 : 0.45 + Math.sin(t * 1.4) * 0.15;
  });
  return (
    <mesh ref={ref} position={[-3.5, 3.5, -8]}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={useFlareTexture()}
      />
    </mesh>
  );
}

function useFlareTexture() {
  return useMemo(() => {
    // Build a soft radial-gradient lens-flare texture in a canvas.
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(180,210,255,0.6)');
    g.addColorStop(0.45, 'rgba(80,120,255,0.18)');
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

/* ──────────────────────────  World  ────────────────────────── */

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#080a0d" roughness={1} metalness={0} />
    </mesh>
  );
}

function ReflectiveRoad() {
  // A glossy reflective strip in front of the vehicle + glowing center dashes.
  const dashes = useMemo(() => {
    const arr: number[] = [];
    for (let z = -40; z <= 40; z += 1.4) arr.push(z);
    return arr;
  }, []);
  return (
    <group>
      {/* Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[5.5, 80]} />
        <meshPhysicalMaterial
          color="#101216"
          roughness={0.4}
          metalness={0.2}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </mesh>
      {/* Side fog stripes — gradient from edges to center */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 3.5, 0.003, 0]}>
          <planeGeometry args={[1.5, 80]} />
          <meshBasicMaterial color="#1a1a1a" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      {/* Center dashed line */}
      {dashes.map((z) => (
        <mesh key={z} position={[0, 0.004, z]}>
          <boxGeometry args={[0.18, 0.002, 0.85]} />
          <meshStandardMaterial color="#e8b14a" emissive="#e8b14a" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Lane lines — solid */}
      {[-1, 1].map((s) => (
        <mesh key={`lane-${s}`} position={[s * 1.4, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, 80]} />
          <meshBasicMaterial color="#e8b14a" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function MountainRing() {
  const peaks = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number }[] = [];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 24 + Math.random() * 6;
      arr.push({
        x: Math.cos(a) * r,
        y: 0,
        z: Math.sin(a) * r,
        s: 2.5 + Math.random() * 4.5,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.s * 0.4, p.z]}>
          <coneGeometry args={[p.s, p.s * 1.9, 5]} />
          <meshStandardMaterial color="#0a0d12" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function CitySilhouette() {
  const buildings = useMemo(() => {
    const arr: { x: number; z: number; w: number; h: number; d: number }[] = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.04;
      const r = 42 + Math.random() * 10;
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        w: 0.7 + Math.random() * 1.4,
        h: 1.5 + Math.random() * 5.5,
        d: 0.7 + Math.random() * 1.4,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#0d1218"
            emissive={i % 5 === 0 ? '#e8b14a' : i % 7 === 0 ? '#3b82f6' : '#000000'}
            emissiveIntensity={i % 5 === 0 ? 0.5 : i % 7 === 0 ? 0.35 : 0}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function DustField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = Math.random() * 2.4 + 0.1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22 - 2;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const geo = ref.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 2] += delta * 1.6;
      if (arr[i + 2] > 10) arr[i + 2] = -14;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffd9a0"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
