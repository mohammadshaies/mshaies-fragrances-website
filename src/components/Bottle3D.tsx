import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, PerformanceMonitor } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect, Component, type ReactNode } from "react";
import * as THREE from "three";
import { prefetchAndCacheModel } from "@/lib/model-cache";

// ============================================================================
// 1. ASSET CONFIGURATION & PRELOADING
// ============================================================================
const MODEL_PATH = "/attar-bottle-model.glb";
const DRACO_PATH = "/draco/";

// Starting pose: live bottle begins at exactly the same angle as the poster
export const INITIAL_ROTATION_Y = 0;

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
export { BottlePoster } from "./BottlePoster";
import { BottlePoster } from "./BottlePoster";

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
// 4b. FRAMELOOP RESUME CONTROLLER (WAKES UP R3F WHEN CANVAS BECOMES VISIBLE)
// ============================================================================
function FrameLoopController({ visible }: { visible: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (visible) {
      invalidate();
    }
  }, [visible, invalidate]);
  return null;
}

// ============================================================================
// 4c. READY SIGNAL (EMITS WHEN FIRST LIVE 3D FRAME DRAWS)
// ============================================================================
function ReadySignal({ onReady }: { onReady: () => void }) {
  const signaledRef = useRef(false);
  useFrame(() => {
    if (!signaledRef.current) {
      signaledRef.current = true;
      onReady();
    }
  });
  return null;
}

// ============================================================================
// 5. 3D MODEL COMPONENT (ADAPTIVE MOBILE / PC PBR MATERIALS)
// ============================================================================
function Model({
  isCompact = false,
  isMobile = false,
  isInteractingRef,
}: {
  isCompact?: boolean;
  isMobile?: boolean;
  isInteractingRef?: { current: boolean };
}) {
  const { size } = useThree();
  const gltf = useGLTF(MODEL_PATH, DRACO_PATH);
  const modelRef = useRef<THREE.Group>(null);

  // Set explicit initial rotation pose matching the poster
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y = INITIAL_ROTATION_Y;
    }
  }, []);

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

          // Crisp anisotropic filtering to prevent texture blur
          if (mat.map) {
            mat.map.anisotropy = 8;
            mat.map.minFilter = THREE.LinearMipmapLinearFilter;
            mat.map.magFilter = THREE.LinearFilter;
            mat.map.generateMipmaps = true;
            mat.map.needsUpdate = true;
          }
          if (mat.normalMap) {
            mat.normalMap.anisotropy = 8;
            mat.normalMap.minFilter = THREE.LinearMipmapLinearFilter;
            mat.normalMap.magFilter = THREE.LinearFilter;
            mat.normalMap.generateMipmaps = true;
            mat.normalMap.needsUpdate = true;
          }
          if (mat.roughnessMap) {
            mat.roughnessMap.anisotropy = 8;
            mat.roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
            mat.roughnessMap.magFilter = THREE.LinearFilter;
            mat.roughnessMap.generateMipmaps = true;
            mat.roughnessMap.needsUpdate = true;
          }

          mat.needsUpdate = true;
          child.material = mat;
        }
      }
    });
    return s;
  }, [gltf.scene, isMobile]);

  // Animation Loop driven by delta:
  // Continuous idle rotation that safely resumes after scroll/visibility change
  useFrame((_, delta) => {
    if (!modelRef.current) return;
    if (isInteractingRef?.current) return;

    // Clamp delta to prevent sudden jump when tab/scroll resumes
    const safeDelta = Math.min(delta, 0.05);
    modelRef.current.rotation.y += safeDelta * 0.85;
  });

  return (
    <group ref={modelRef} scale={[scaleVal, scaleVal, scaleVal]} rotation={[0, INITIAL_ROTATION_Y, 0]}>
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
  const isInteractingRef = useRef(false);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect mobile & touch capabilities
  useEffect(() => {
    if (typeof window !== "undefined") {
      const touch =
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;
      setIsTouchDevice(touch);
    }
  }, []);

  const isMobile = isCompact || isTouchDevice;

  // DPR configuration:
  // Desktop is kept unchanged at [1, 1.5].
  // Mobile starts at crisp Retina [1, 2] with antialias on to eliminate blur/pixelation.
  // PerformanceMonitor will lower mobile DPR only if FPS drops under load.
  const [dpr, setDpr] = useState<[number, number]>(() =>
    typeof window !== "undefined" && (window.innerWidth < 1024 || "ontouchstart" in window)
      ? [1, 2]
      : [1, 1.5]
  );

  useEffect(() => {
    if (isMobile) {
      setDpr([1, 2]);
    } else {
      setDpr([1, 1.5]);
    }
  }, [isMobile]);

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
        rootMargin: "80px 0px 80px 0px"
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [isReady, setIsReady] = useState(false);
  const [isPosterMounted, setIsPosterMounted] = useState(true);

  // Active rendering condition
  const visible = isInView && isTabVisible;

  return (
    <WebGLErrorBoundary fallback={<BottlePoster isCompact={isCompact} />}>
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center select-none ${
          isCompact
            ? "min-h-[220px] xs:min-h-[250px] sm:min-h-[280px]"
            : "min-h-[440px] lg:min-h-[500px] cursor-grab active:cursor-grabbing"
        }`}
        style={{
          touchAction: "pan-y",
        }}
      >
        {/* Seamless static poster layer: identical framing, dimensions, and background */}
        {isPosterMounted && (
          <img
            src="/bottle-poster.webp"
            alt="M.shaies Luxury Flacon"
            fetchPriority="high"
            decoding="async"
            onTransitionEnd={() => {
              if (isReady) setIsPosterMounted(false);
            }}
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10 transition-opacity duration-[350ms] ease-out ${
              isCompact ? "p-4" : "p-6"
            } ${isReady ? "opacity-0" : "opacity-100"}`}
          />
        )}

        {/* 3D WebGL Canvas: starts at opacity 0, crossfades to 1 once first frame renders */}
        <div
          className={`w-full h-full transition-opacity duration-[350ms] ease-out ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <Canvas
            frameloop={visible ? "always" : "never"}
            dpr={dpr}
            camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
            gl={{
              antialias: true, // Antialias ON for sharp non-pixelated edges
              alpha: true,
              stencil: false,
              depth: true,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.18,
            }}
            style={{ 
              width: "100%",
              height: "100%",
            }}
          >
            {/* Automatically wake up R3F render loop when canvas becomes visible */}
            <FrameLoopController visible={visible} />

            {/* PerformanceMonitor: adaptively reduces mobile DPR only if frame rate drops */}
            {isMobile && (
              <PerformanceMonitor
                ms={300}
                iterations={7}
                threshold={0.7}
                onDecline={() => {
                  setDpr((current) => (current[1] > 1.5 ? [1, 1.5] : [1, 1.2]));
                }}
                onIncline={() => {
                  setDpr([1, 2]);
                }}
              />
            )}

            <SceneLights isMobile={isMobile} />
            <SceneEnvironment />

            <Suspense fallback={null}>
              <Model
                isCompact={isCompact}
                isMobile={isMobile}
                isInteractingRef={isInteractingRef}
              />
              <ReadySignal onReady={() => setIsReady(true)} />
            </Suspense>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate={false}
              enableRotate={true}
              rotateSpeed={0.8}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.6}
              onStart={() => {
                isInteractingRef.current = true;
              }}
              onEnd={() => {
                isInteractingRef.current = false;
              }}
            />
          </Canvas>
        </div>
      </div>
    </WebGLErrorBoundary>
  );
}
