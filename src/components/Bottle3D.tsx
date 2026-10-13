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
// 3. ULTRA-OPTIMIZED, LUMINOUS 3D MODEL COMPONENT
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

  // Enhanced materials for radiant gold, crystal glass, and glowing amber perfume
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
          if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
            // Brighten base diffuse colors for radiant clarity
            if (child.material.color) {
              child.material.color.multiplyScalar(1.48);
            }
            // Sparkling reflections on metallic cap and glass facets
            child.material.envMapIntensity = 3.6;
            child.material.roughness = Math.min(child.material.roughness, 0.12);
            child.material.metalness = Math.max(child.material.metalness, 0.58);
            // Rich internal amber-gold radiance so the bottle never appears dark or shadowy
            child.material.emissive = new THREE.Color(0x483416);
            child.material.emissiveIntensity = 0.45;
            child.material.needsUpdate = true;
          }
        }
      }
    });
    return s;
  }, [gltf.scene]);

  // Combined rotation and gentle floating animation in a single 60fps frame tick
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.42;
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
// 4. MAIN EXPORT: 3D BOTTLE WITH BRILLIANT LUMINOUS STUDIO RIG
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

  // Optimal DPR: Crisp on retina screens without GPU fill-rate throttling
  const dpr: [number, number] = isTouchDevice ? [1, 1.35] : [1, 1.5];

  // Immediately pause WebGL loop when hero is scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.08);
      },
      { threshold: [0, 0.08, 0.25, 0.5] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause render loop during active mobile scrolling for buttery smooth 60fps DOM scrolling
  useEffect(() => {
    if (!isTouchDevice) return;
    let timer: any;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsScrolling(false);
      }, 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isTouchDevice]);

  const isNonInteractive = isCompact || isTouchDevice;
  const shouldRender = isInView && (!isTouchDevice || !isScrolling);

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
        contain: "layout paint",
        willChange: "transform",
      }}
    >
      <Canvas
        frameloop={shouldRender ? "always" : "never"}
        dpr={dpr}
        camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.85,
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        {/* Ambient base illumination */}
        <ambientLight intensity={2.8} color="#ffffff" />
        
        {/* Front Key Light */}
        <directionalLight position={[4, 7, 6]} intensity={3.4} color="#ffffff" />
        
        {/* Warm Gold Accent Fill Light */}
        <directionalLight position={[-5, 5, 5]} intensity={2.6} color="#fff6e8" />
        
        {/* Rim Contour Backlight */}
        <directionalLight position={[0, 6, -6]} intensity={2.6} color="#ffffff" />

        {/* Front Direct Spot Glow */}
        <pointLight position={[0, 1.5, 3.5]} intensity={3.0} color="#ffffff" distance={15} />
        
        {/* Base Pedestal Uplight for Glowing Amber Perfume */}
        <pointLight position={[0, -2.5, 2.5]} intensity={2.4} color="#ffe8b8" distance={12} />

        {/* 100% OFFLINE MULTI-PANEL PROCEDURAL STUDIO ENVIRONMENT (frames=1 bakes cubemap once) */}
        <Environment frames={1}>
          {/* Top Overhanging Softbox */}
          <mesh position={[0, 10, 0]} scale={[16, 16, 1]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Front Right Fill Light Panel */}
          <mesh position={[8, 4, 6]} scale={[12, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Front Left Warm Accent Panel */}
          <mesh position={[-8, 4, 6]} scale={[12, 12, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#fff3dc" />
          </mesh>
          {/* Back Rim Light Panel */}
          <mesh position={[0, 4, -8]} scale={[14, 14, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Bottom Warm Ground Reflector */}
          <mesh position={[0, -6, 0]} scale={[16, 16, 1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry />
            <meshBasicMaterial color="#ffeecb" />
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
