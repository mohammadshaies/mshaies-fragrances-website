import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, useProgress, Html, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect, useCallback } from "react";
import * as THREE from "three";

// ============================================================================
// 1. ASSET PRELOADING
// ============================================================================
useGLTF.preload("/attar-bottle-model.glb");

// ============================================================================
// 2. LOADING COMPONENT
// ============================================================================
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-background/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-gold/40 shadow-lg min-w-[170px] select-none">
        <div className="relative size-10 flex items-center justify-center">
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle cx="20" cy="20" r="16" className="stroke-muted fill-none stroke-[2]" />
            <circle
              cx="20" cy="20" r="16"
              className="stroke-gold fill-none stroke-[2]"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - (progress || 10) / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-serif text-[11px] font-bold text-ink">{Math.round(progress || 0)}%</span>
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-gold-deep mt-2 font-semibold animate-pulse text-center">
          Loading 3D Bottle...
        </p>
      </div>
    </Html>
  );
}

// ============================================================================
// 3. 3D MODEL — separate mobile/desktop material quality
// ============================================================================
function Model({ isCompact = false, isMobile = false }: { isCompact?: boolean; isMobile?: boolean }) {
  const { size } = useThree();
  const gltf = useGLTF("/attar-bottle-model.glb");
  const modelRef = useRef<THREE.Group>(null);

  const scaleVal = useMemo(() => {
    if (isCompact || size.width < 280) return 1.62;
    if (size.width < 450) return 1.78;
    return 1.92;
  }, [isCompact, size.width]);

  const clonedScene = useMemo(() => {
    const s = gltf.scene.clone(true);

    const box = new THREE.Box3().setFromObject(s);
    const center = new THREE.Vector3();
    box.getCenter(center);
    s.position.sub(center);

    s.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
        if (child.material) {
          const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
          const mat = origMat.clone();

          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            // Authentic original bottle color — no tinting
            if (origMat.color) mat.color = origMat.color.clone();

            // Gold needs strong env reflections — 1.8 brings back the gold shine
            mat.envMapIntensity = isMobile ? 1.6 : 1.8;
            // Slightly less rough than pure mirror, gives gold the characteristic sheen
            mat.roughness = 0.20;
            mat.metalness = 0.65;
            // Warm amber internal glow — restores rich gold depth
            mat.emissive = new THREE.Color(0x2a1500);
            mat.emissiveIntensity = 0.18;

            // Crisp texture filtering
            if (mat.map) {
              mat.map.anisotropy = isMobile ? 2 : 4;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.generateMipmaps = true;
              mat.map.needsUpdate = true;
            }
            mat.needsUpdate = true;
          }
          child.material = mat;
        }
      }
    });
    return s;
  }, [gltf.scene, isMobile]);

  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += Math.min(delta, 0.033) * 0.45;
    }
  });

  return (
    <group ref={modelRef} scale={[scaleVal, scaleVal, scaleVal]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 4. SCENE LIGHTS — mobile gets 2 lights, desktop gets 5 for richness
// ============================================================================
function SceneLights({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <>
        {/* Single ambient — warm gold tone */}
        <ambientLight intensity={1.2} color="#ffe8c0" />
        {/* One strong key from front-top */}
        <directionalLight position={[3, 6, 5]} intensity={1.8} color="#fff4d8" />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[4, 8, 6]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[-5, 5, 5]} intensity={1.1} color="#fff6e8" />
      <directionalLight position={[0, 6, -6]} intensity={0.9} color="#ffffff" />
      <pointLight position={[0, 1.5, 3.5]} intensity={1.5} color="#ffffff" distance={15} />
      <pointLight position={[0, -2.5, 2.5]} intensity={0.9} color="#ffe8b8" distance={12} />
    </>
  );
}

// ============================================================================
// 5. ENVIRONMENT — warm golden amber panels that actually make gold look gold
// ============================================================================
function SceneEnvironment() {
  return (
    // frames=1 bakes the env cubemap once and never re-renders — free after load
    <Environment frames={1}>
      {/* Top overhead — warm bright gold light */}
      <mesh position={[0, 10, 0]} scale={[16, 16, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#d4a843" />
      </mesh>
      {/* Front right fill — amber gold */}
      <mesh position={[8, 4, 6]} scale={[12, 12, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#c89030" />
      </mesh>
      {/* Front left accent — deeper amber */}
      <mesh position={[-8, 4, 6]} scale={[12, 12, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#b07820" />
      </mesh>
      {/* Back rim — dark warm brown for depth + contrast */}
      <mesh position={[0, 4, -8]} scale={[14, 14, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#4a3010" />
      </mesh>
      {/* Bottom ground reflector — warm gold bounce */}
      <mesh position={[0, -6, 0]} scale={[16, 16, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#c8a040" />
      </mesh>
    </Environment>
  );
}

// ============================================================================
// 6. MAIN EXPORT
// ============================================================================
export function Bottle3D({ isCompact = false }: { isCompact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch / mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTouchDevice(
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  // Scroll detection — pause WebGL during scroll on mobile (200ms debounce)
  const handleScroll = useCallback(() => {
    if (!isTouchDevice) return;
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 200);
  }, [isTouchDevice]);

  useEffect(() => {
    if (!isTouchDevice) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [isTouchDevice, handleScroll]);

  // Pause when scrolled fully out of view → zero GPU
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // DPR:
  //   Mobile: [1, 1.3] — sharp enough for crisp textures, not GPU-killing
  //   Desktop: [1, 1.5]
  const dpr: [number, number] = isTouchDevice ? [1, 1.3] : [1, 1.5];

  // frameloop:
  //   out of view → "never"  (0% GPU)
  //   scrolling on mobile → "demand" (no continuous 60fps during scroll)
  //   otherwise → "always" (smooth rotation)
  const frameloop: "always" | "demand" | "never" = !isInView
    ? "never"
    : isScrolling
    ? "demand"
    : "always";

  const isNonInteractive = isCompact || isTouchDevice;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center select-none ${
        isNonInteractive
          ? "min-h-[220px] xs:min-h-[250px] sm:min-h-[280px] pointer-events-none"
          : "min-h-[440px] lg:min-h-[500px] cursor-grab active:cursor-grabbing pointer-events-auto"
      }`}
      style={{
        touchAction: isNonInteractive ? "auto" : "none",
        contain: "layout paint",
      }}
    >
      <Canvas
        frameloop={frameloop}
        dpr={dpr}
        camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
        gl={{
          // Disable antialias on mobile — saves significant GPU, DPR 1.3 already gives clean edges
          antialias: !isTouchDevice,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          // 1.15 — balanced: gold tones show through without being washed out bright
          toneMappingExposure: 1.15,
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        <SceneLights isMobile={isTouchDevice} />
        <SceneEnvironment />

        <Suspense fallback={<Loader />}>
          <Model isCompact={isCompact} isMobile={isTouchDevice} />
        </Suspense>

        {!isNonInteractive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            enableRotate={true}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.6}
          />
        )}
      </Canvas>
    </div>
  );
}
