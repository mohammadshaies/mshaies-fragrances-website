import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect, Component, type ReactNode } from "react";
import * as THREE from "three";
import { prefetchAndCacheModel } from "@/lib/model-cache";

// ============================================================================
// 1. ASSET CONFIGURATION & PRELOADING
// ============================================================================
const MODEL_PATH = "/attar-bottle-model.glb";
const DRACO_PATH = "/draco/";

useGLTF.preload(MODEL_PATH, DRACO_PATH);

if (typeof window !== "undefined") {
  prefetchAndCacheModel(MODEL_PATH);
}

// ============================================================================
// 2. ERROR BOUNDARY FOR WEBGL CRASHES / UNSUPPORTED DEVICES
// ============================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("[Bottle3D] WebGL render error, falling back to static poster:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ============================================================================
// 3. STATIC POSTER COMPONENT (FAST LCP & ZERO CLS FALLBACK)
// ============================================================================
export function BottlePoster({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isCompact ? "p-4" : "p-6"
      }`}
    >
      <img
        src="/product-desert-gold.png"
        alt="M.shaies Luxury Flacon"
        fetchPriority="high"
        decoding="async"
        className={`w-auto object-contain drop-shadow-[0_20px_35px_rgba(212,175,55,0.25)] transition-opacity duration-500 ${
          isCompact ? "max-h-[190px] xs:max-h-[220px]" : "max-h-[420px] lg:max-h-[460px]"
        }`}
      />
    </div>
  );
}

// ============================================================================
// 4. FAKE CONTACT SHADOW (0 SHADOW MAP COST)
// ============================================================================
function FakeContactShadow() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(20, 14, 5, 0.45)");
    gradient.addColorStop(0.4, "rgba(30, 20, 8, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  if (!texture) return null;

  return (
    <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial map={texture} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

// ============================================================================
// 5. 3D MODEL COMPONENT (ADAPTIVE MOBILE / PC PBR MATERIALS)
// ============================================================================
function Model({ isCompact = false, isMobile = false }: { isCompact?: boolean; isMobile?: boolean }) {
  const { size } = useThree();
  const gltf = useGLTF(MODEL_PATH, DRACO_PATH);
  const modelRef = useRef<THREE.Group>(null);
  const lastTickRef = useRef(0);

  // Calibrated scale
  const scaleVal = useMemo(() => {
    if (isCompact || size.width < 280) return 1.62;
    if (size.width < 450) return 1.78;
    return 1.92;
  }, [isCompact, size.width]);

  // Adaptive materials: MeshStandardMaterial on mobile (bypasses transmission/physical cost)
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

          let mat: THREE.MeshStandardMaterial;

          if (isMobile) {
            // Mobile: Standard material with optimized shader instructions
            mat = new THREE.MeshStandardMaterial({
              map: origMat.map || null,
              normalMap: origMat.normalMap || null,
              roughnessMap: origMat.roughnessMap || null,
              metalnessMap: origMat.metalnessMap || null,
              metalness: 0.92,
              roughness: 0.18,
              envMapIntensity: 2.0,
              emissive: new THREE.Color(0x281604),
              emissiveIntensity: 0.18,
            });
            if (origMat.color) mat.color = origMat.color.clone();
          } else {
            // PC: Full Physical material with maximum specular sheen
            mat = origMat.clone();
            if (mat.isMeshStandardMaterial || (mat as any).isMeshPhysicalMaterial) {
              if (origMat.color) mat.color = origMat.color.clone();
              mat.metalness = 0.95;
              mat.roughness = 0.16;
              mat.envMapIntensity = 2.4;
              mat.emissive = new THREE.Color(0x281604);
              mat.emissiveIntensity = 0.18;
            }
          }

          // Crisp anisotropic filtering
          if (mat.map) {
            mat.map.anisotropy = isMobile ? 4 : 8;
            mat.map.minFilter = THREE.LinearMipmapLinearFilter;
            mat.map.magFilter = THREE.LinearFilter;
            mat.map.generateMipmaps = true;
            mat.map.needsUpdate = true;
          }
          if (mat.normalMap) mat.normalMap.anisotropy = 4;
          if (mat.roughnessMap) mat.roughnessMap.anisotropy = 4;

          mat.needsUpdate = true;
          child.material = mat;
        }
      }
    });
    return s;
  }, [gltf.scene, isMobile]);

  // Animation Loop:
  // Mobile throttled to ~30fps ticks to halve GPU power consumption
  // Desktop runs smooth 60fps
  useFrame((state, delta) => {
    if (!modelRef.current) return;

    if (isMobile) {
      const now = state.clock.getElapsedTime();
      if (now - lastTickRef.current < 0.033) return; // limit to 30fps ticks
      lastTickRef.current = now;
      modelRef.current.rotation.y += 0.033 * 0.85;
    } else {
      modelRef.current.rotation.y += Math.min(delta, 0.033) * 0.85;
    }
  });

  return (
    <group ref={modelRef} scale={[scaleVal, scaleVal, scaleVal]}>
      <primitive object={clonedScene} />
      <FakeContactShadow />
    </group>
  );
}

// ============================================================================
// 6. SCENE LIGHTS — ADAPTIVE LIGHTING (MOBILE: 1 KEY + 1 AMBIENT)
// ============================================================================
function SceneLights({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <>
        {/* Single ambient + single directional sun key */}
        <ambientLight intensity={1.1} color="#ffe2b0" />
        <directionalLight position={[3.5, 6, 5]} intensity={2.2} color="#fff8e8" />
      </>
    );
  }

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
// 7. ENVIRONMENT — LUXURY JEWELRY STUDIO (BAKED CUBEMAP REFLECTIONS)
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
// 8. MAIN EXPORT: ADAPTIVE 3D BOTTLE ENGINE
// ============================================================================
export function Bottle3D({ isCompact = false }: { isCompact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  // Detect mobile & low-end capabilities
  useEffect(() => {
    if (typeof window !== "undefined") {
      const touch =
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;
      setIsTouchDevice(touch);

      const cores = navigator.hardwareConcurrency || 4;
      const mem = (navigator as any).deviceMemory || 4;
      const lowEnd = cores <= 4 || mem <= 4;
      setIsLowEndDevice(lowEnd);
    }
  }, []);

  // Pause render loop when browser tab is inactive / hidden
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // IntersectionObserver: strictly pauses WebGL when scrolled out of view
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

  // Capped pixel ratio: dpr={[1, 1.5]} max
  const dpr: [number, number] = useMemo(() => {
    if (isLowEndDevice || isTouchDevice) {
      return [1, 1.25];
    }
    return [1, 1.5];
  }, [isLowEndDevice, isTouchDevice]);

  const isNonInteractive = isCompact || isTouchDevice;

  // Active rendering condition
  const shouldRender = isInView && isTabVisible;

  return (
    <WebGLErrorBoundary fallback={<BottlePoster isCompact={isCompact} />}>
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
          frameloop={shouldRender ? "always" : "never"}
          dpr={dpr}
          camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
          gl={{
            // Disabling antialias on low-end/touch saves substantial GPU memory while DPR 1.25 keeps edges crisp
            antialias: !isTouchDevice,
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

          <Suspense fallback={null}>
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
    </WebGLErrorBoundary>
  );
}
