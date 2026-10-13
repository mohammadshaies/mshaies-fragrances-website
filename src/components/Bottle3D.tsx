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
            <circle
              cx="20"
              cy="20"
              r="16"
              className="stroke-muted fill-none stroke-[2]"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
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
// 3. 3D MODEL COMPONENT (ADAPTIVE MOBILE / DESKTOP MATERIALS)
// ============================================================================
function Model({ isCompact = false }: { isCompact?: boolean }) {
  const { size } = useThree();
  const gltf = useGLTF("/attar-bottle-model.glb");
  const modelRef = useRef<THREE.Group>(null);

  // Calibrated golden-ratio scale
  const scaleVal = useMemo(() => {
    if (isCompact || size.width < 280) return 1.62;
    if (size.width < 450) return 1.78;
    return 1.92;
  }, [isCompact, size.width]);

  // Adaptive materials — darkened, richer tones
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
            // Authentic color — no tinting
            if (origMat.color) {
              mat.color = origMat.color.clone();
            }
            // Darker: lower env reflection intensity
            mat.envMapIntensity = 1.2;
            // Less shiny = darker appearance
            mat.roughness = 0.28;
            mat.metalness = 0.58;
            // Subtle warm glow — much lower than before
            mat.emissive = new THREE.Color(0x1a1005);
            mat.emissiveIntensity = 0.10;

            // Crisp texture mipmapping & anisotropic filtering
            if (mat.map) {
              mat.map.anisotropy = 4;
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
  }, [gltf.scene]);

  // Silky smooth continuous rotation
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
// 4. MAIN EXPORT: 3D BOTTLE ENGINE
// ============================================================================
export function Bottle3D({ isCompact = false }: { isCompact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch devices
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    }
  }, []);

  // Pause rendering during scroll on mobile — use "demand" so one final frame
  // is painted when scroll stops (avoids frozen/jitter look)
  const handleScroll = useCallback(() => {
    if (!isTouchDevice) return;
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 120); // resume 120ms after scroll ends
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

  // Lower DPR on mobile for GPU relief
  const dpr: [number, number] = isCompact || isTouchDevice ? [1, 1.15] : [1, 1.5];

  // Pause WebGL when scrolled out of view (0% GPU usage)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isNonInteractive = isCompact || isTouchDevice;

  // frameloop logic:
  //   • Out of view → "never" (zero GPU)
  //   • In view + scrolling on mobile → "demand" (one frame when needed, no continuous render)
  //   • In view + not scrolling → "always" (smooth rotation)
  const frameloop = !isInView
    ? "never"
    : isScrolling
    ? "demand"
    : "always";

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
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          // Lowered from 1.55 → 1.05 to darken overall render
          toneMappingExposure: 1.05,
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        {/* Ambient base — reduced from 2.0 → 0.8 */}
        <ambientLight intensity={0.8} color="#ffffff" />

        {/* Front Key Light — reduced from 2.8 → 1.6 */}
        <directionalLight position={[4, 8, 6]} intensity={1.6} color="#ffffff" />

        {/* Warm Gold Accent Fill — reduced from 2.0 → 1.0 */}
        <directionalLight position={[-5, 5, 5]} intensity={1.0} color="#fff6e8" />

        {/* Rim Contour Backlight — reduced from 2.2 → 1.0 */}
        <directionalLight position={[0, 6, -6]} intensity={1.0} color="#ffffff" />

        {/* Front Direct Spot — reduced from 2.4 → 1.4 */}
        <pointLight position={[0, 1.5, 3.5]} intensity={1.4} color="#ffffff" distance={15} />

        {/* Base Pedestal Uplight — reduced from 1.8 → 1.0 */}
        <pointLight position={[0, -2.5, 2.5]} intensity={1.0} color="#ffe8b8" distance={12} />

        {/* Multi-Panel Studio Environment — warmer, darker tones (frames=1 bakes once) */}
        <Environment frames={1}>
          {/* Top Softbox — off-white warm grey */}
          <mesh position={[0, 10, 0]} scale={[16, 16, 1]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry />
            <meshBasicMaterial color="#c8bfa8" />
          </mesh>
          {/* Front Right Fill — warm grey */}
          <mesh position={[8, 4, 6]} scale={[12, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#b8ad98" />
          </mesh>
          {/* Front Left Warm Accent */}
          <mesh position={[-8, 4, 6]} scale={[12, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#a89878" />
          </mesh>
          {/* Back Rim Light — dark warm grey for contrast */}
          <mesh position={[0, 4, -8]} scale={[14, 14, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#a09070" />
          </mesh>
          {/* Bottom Ground Reflector */}
          <mesh position={[0, -6, 0]} scale={[16, 16, 1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry />
            <meshBasicMaterial color="#c8b080" />
          </mesh>
        </Environment>

        {/* 3D Bottle Model */}
        <Suspense fallback={<Loader />}>
          <Model isCompact={isCompact} />
        </Suspense>

        {/* Interactive orbit controls (PC only) */}
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
