import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, useProgress, Html, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect } from "react";
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

  // Adaptive materials: ultra-fast on mobile, maximum luxury specular on PC
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
          // Clone material so each instance has independent shaders without mutating or corrupting gltf cache
          const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
          const mat = origMat.clone();

          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            // Authentic natural colors - preserve original rich gold and flacon tones
            if (origMat.color) {
              mat.color = origMat.color.clone();
            }
            mat.envMapIntensity = 1.0;
            mat.roughness = 0.22;
            mat.metalness = 0.52;
            // Gentle warm amber flacon depth (subtle depth, not blinding)
            mat.emissive = new THREE.Color(0x18120a);
            mat.emissiveIntensity = 0.12;

            // Crisp texture mipmapping & anisotropic filtering (eliminates blur without GPU stall)
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

  // Silky smooth rotation & micro-floating animation at native 60fps
  useFrame((state, delta) => {
    if (modelRef.current) {
      const d = Math.min(delta, 0.033);
      modelRef.current.rotation.y += d * 0.45;
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.3) * 0.035;
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

  // Detect touch devices to disable touch interference
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    }
  }, []);

  // Pause WebGL rendering during active mobile scrolling for 100% fluid 60fps/120Hz native scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    let scrollTimer: any;
    let scrolling = false;

    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        setIsScrolling(true);
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrolling = false;
        setIsScrolling(false);
      }, 80);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  // Mobile: 1.45x DPR provides crisp, sharp Retina rendering with 0 pixelation while using 50% less GPU memory than 2.0x
  const dpr: [number, number] = isCompact || isTouchDevice ? [1, 1.45] : [1, 1.75];

  // Pause continuous rendering when hero is scrolled out of view (0% background GPU consumption)
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
        frameloop={isInView && !isScrolling ? "always" : "demand"}
        dpr={dpr}
        camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        {/* Balanced Studio Lighting Rig (No glare, deep luxury contrast) */}
        <ambientLight intensity={1.3} color="#ffffff" />
        
        {/* Front Key Light */}
        <directionalLight position={[3.5, 5.5, 4.5]} intensity={1.8} color="#ffffff" />
        
        {/* Warm Gold Accent Fill Light */}
        <directionalLight position={[-4, 3.5, 3]} intensity={1.1} color="#fff6e8" />
        
        {/* Rim Contour Backlight for Flacon Silhouette Definition */}
        <directionalLight position={[0, 4.5, -4.5]} intensity={1.0} color="#ffffff" />

        {/* Soft Studio Environment with Dark Contrast Backdrop */}
        <Environment frames={1}>
          {/* Top Diffused Softbox */}
          <mesh position={[0, 8, 0]} scale={[12, 12, 1]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry />
            <meshBasicMaterial color="#f8f4ee" />
          </mesh>
          {/* Key Light Strip */}
          <mesh position={[6, 3, 4]} scale={[8, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#f0e6d2" />
          </mesh>
          {/* Fill Light Strip */}
          <mesh position={[-6, 3, 4]} scale={[8, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#e8dcbf" />
          </mesh>
          {/* Dark Luxury Backdrop (creates rich contrast and prevents washing out) */}
          <mesh position={[0, 3, -6]} scale={[14, 14, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#1a1510" />
          </mesh>
        </Environment>

        {/* 3D Bottle Model */}
        <Suspense fallback={<Loader />}>
          <Model isCompact={isCompact} />
        </Suspense>

        {/* Interactive orbit controls (only for PC mouse drag; disabled on touch) */}
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
