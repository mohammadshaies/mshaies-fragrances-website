import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, useProgress, Html, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import * as THREE from "three";
import { prefetchAndCacheModel } from "@/lib/model-cache";

// ============================================================================
// 1. ASSET PRELOADING WITH LOCAL DRACO DECODER & DATABASE CACHING
// ============================================================================
// Local /draco/ decoders eliminate cross-origin network latency from gstatic.
const MODEL_PATH = "/attar-bottle-model.glb";
const DRACO_PATH = "/draco/";

useGLTF.preload(MODEL_PATH, DRACO_PATH);

// Proactively populate the client-side IndexedDB database cache
if (typeof window !== "undefined") {
  prefetchAndCacheModel(MODEL_PATH);
}

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
// 3. 3D MODEL COMPONENT — 24K GOLD & CRYSTAL PBR MATERIAL
// ============================================================================
function Model({ isCompact = false, isMobile = false }: { isCompact?: boolean; isMobile?: boolean }) {
  const { size } = useThree();
  const gltf = useGLTF(MODEL_PATH, DRACO_PATH);
  const modelRef = useRef<THREE.Group>(null);

  // Calibrated scale
  const scaleVal = useMemo(() => {
    if (isCompact || size.width < 280) return 1.62;
    if (size.width < 450) return 1.78;
    return 1.92;
  }, [isCompact, size.width]);

  // Premium 24K Gold & Faceted Crystal Material Setup
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
            // Retain original authentic base color and textures (no muddy color multiplication)
            if (origMat.color) {
              mat.color = origMat.color.clone();
            }

            // High metallic allows the golden environment map to gleam realistically
            mat.metalness = 0.95;
            // Glossy polished finish gives crystal clarity and crisp specular highlights
            mat.roughness = 0.16;
            // High environment reflection intensity delivers brilliant 24K gold reflections
            mat.envMapIntensity = isMobile ? 2.0 : 2.4;

            // Warm amber perfume liquid radiance from within the flacon
            mat.emissive = new THREE.Color(0x281604);
            mat.emissiveIntensity = 0.18;

            // Razor-sharp texture mipmapping and anisotropic filtering
            if (mat.map) {
              mat.map.anisotropy = isMobile ? 4 : 8;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.generateMipmaps = true;
              mat.map.needsUpdate = true;
            }
            if (mat.normalMap) {
              mat.normalMap.anisotropy = 4;
            }
            if (mat.roughnessMap) {
              mat.roughnessMap.anisotropy = 4;
            }
            mat.needsUpdate = true;
          }
          child.material = mat;
        }
      }
    });
    return s;
  }, [gltf.scene, isMobile]);

  // Smooth, lively luxury rotation speed (0.85 rad/s: ~7.4s per full rotation)
  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += Math.min(delta, 0.033) * 0.85;
    }
  });

  return (
    <group ref={modelRef} scale={[scaleVal, scaleVal, scaleVal]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 4. SCENE LIGHTS — ADAPTIVE MOBILE & DESKTOP LIGHTING
// ============================================================================
function SceneLights({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    // Mobile optimized 2-light rig (cuts GPU pixel shader overhead in half)
    return (
      <>
        <ambientLight intensity={1.1} color="#ffe2b0" />
        <directionalLight position={[3.5, 6, 5]} intensity={2.2} color="#fff8e8" />
      </>
    );
  }

  // Desktop full 4-light studio rig
  return (
    <>
      <ambientLight intensity={0.9} color="#ffe2b0" />
      <directionalLight position={[4, 7, 5]} intensity={2.2} color="#fff8e8" />
      <directionalLight position={[-5, 4, 4]} intensity={1.4} color="#ffd466" />
      <directionalLight position={[0, 6, -5]} intensity={1.2} color="#ffeaa6" />
      <pointLight position={[0, -2.2, 2.5]} intensity={1.0} color="#ffbe3b" distance={10} />
    </>
  );
}

// ============================================================================
// 5. ENVIRONMENT — LUXURY JEWELRY STUDIO (GOLD HIGHLIGHTS & DARK FLAGS)
// ============================================================================
function SceneEnvironment() {
  return (
    <Environment frames={1}>
      {/* Overhead Softbox — brilliant warm champagne gold */}
      <mesh position={[0, 9, 1]} scale={[16, 12, 1]} rotation={[Math.PI / 2.3, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#ffe899" />
      </mesh>

      {/* Front-Right 24K Gold Reflection Strip */}
      <mesh position={[7, 3, 5]} scale={[10, 14, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#e6a817" />
      </mesh>

      {/* Front-Left Deep Amber Fill Strip */}
      <mesh position={[-7, 3, 5]} scale={[10, 14, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#d49210" />
      </mesh>

      {/* Dark Velvet Negative Fill Flags (essential for gold reflection contrast) */}
      <mesh position={[0, 4, -8]} scale={[16, 16, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#0d0905" />
      </mesh>
      <mesh position={[10, 0, 0]} scale={[8, 16, 1]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#080603" />
      </mesh>
      <mesh position={[-10, 0, 0]} scale={[8, 16, 1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#080603" />
      </mesh>

      {/* Warm Gold Ground Reflector */}
      <mesh position={[0, -6, 0]} scale={[18, 18, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry />
        <meshBasicMaterial color="#d49a26" />
      </mesh>
    </Environment>
  );
}

// ============================================================================
// 6. MAIN EXPORT: HIGH-PERFORMANCE 3D BOTTLE ENGINE
// ============================================================================
export function Bottle3D({ isCompact = false }: { isCompact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch / mobile capabilities once
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    }
  }, []);

  // Strict IntersectionObserver:
  // When scrolled out of the hero viewport, completely pause WebGL rendering
  // (0% GPU, 0% CPU consumption during catalog browsing and checkout)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { 
        threshold: 0,
        rootMargin: "60px 0px 60px 0px"
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Calibrated DPR:
  // Mobile: [1, 1.25] — eliminates mobile GPU bottleneck while keeping crispness
  // Desktop: [1, 1.75]
  const dpr: [number, number] = useMemo(() => {
    return isCompact || isTouchDevice ? [1, 1.25] : [1, 1.75];
  }, [isCompact, isTouchDevice]);

  const isNonInteractive = isCompact || isTouchDevice;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center select-none transform-gpu ${
        isNonInteractive
          ? "min-h-[220px] xs:min-h-[250px] sm:min-h-[280px] pointer-events-none"
          : "min-h-[440px] lg:min-h-[500px] cursor-grab active:cursor-grabbing pointer-events-auto"
      }`}
      style={{
        touchAction: isNonInteractive ? "auto" : "none",
        contain: "layout paint size",
      }}
    >
      <Canvas
        frameloop={isInView ? "always" : "never"}
        dpr={dpr}
        camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
        style={{ 
          pointerEvents: isNonInteractive ? "none" : "auto",
          width: "100%",
          height: "100%",
        }}
      >
        <SceneLights isMobile={isTouchDevice} />
        <SceneEnvironment />

        <Suspense fallback={<Loader />}>
          <Model isCompact={isCompact} isMobile={isTouchDevice} />
        </Suspense>

        {/* Orbit controls only on desktop mouse drag */}
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
