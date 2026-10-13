import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, useGLTF, OrbitControls, useProgress, Html, Environment } from "@react-three/drei";
import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import * as THREE from "three";

// ============================================================================
// 1. ASSET PRELOADING
// ============================================================================
// Preloads the 3D GLB model in the browser cache so it displays with zero delay.
useGLTF.preload("/attar-bottle-model.glb");

// ============================================================================
// 2. LOADING COMPONENT (SPINNER WITH PERCENTAGE)
// ============================================================================
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-background/90 backdrop-blur-md px-5 py-4 rounded-2xl border border-gold/40 shadow-lg min-w-[200px] select-none">
        {/* Animated circular progress indicator */}
        <div className="relative size-12 flex items-center justify-center">
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-muted fill-none stroke-[2.5]"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-gold fill-none stroke-[2.5]"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - (progress || 10) / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-serif text-xs font-bold text-ink">{Math.round(progress || 0)}%</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep mt-2.5 font-semibold animate-pulse text-center">
          Loading 3D Bottle...
        </p>
      </div>
    </Html>
  );
}

// ============================================================================
// 3. 3D MODEL COMPONENT (GEOMETRY & MATERIALS)
// ============================================================================
function Model({ isCompact = false }: { isCompact?: boolean }) {
  const { size } = useThree();
  const gltf = useGLTF("/attar-bottle-model.glb");
  const modelRef = useRef<THREE.Group>(null);

  // Calibrated golden-ratio scale: prominent and clear without exceeding the hero section
  const scaleVal = useMemo(() => {
    if (isCompact || size.width < 280) return 1.62;
    if (size.width < 450) return 1.78;
    return 1.92;
  }, [isCompact, size.width]);

  // Clear, luminous luxury glass & polished gold filigree
  const clonedScene = useMemo(() => {
    const s = gltf.scene.clone(true);

    // Auto-calculate exact bounding box and center pivot at (0, 0, 0)
    const box = new THREE.Box3().setFromObject(s);
    const center = new THREE.Vector3();
    box.getCenter(center);
    s.position.sub(center);

    s.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
            // Enhanced clarity and brightness so details are easily visible
            if (child.material.color) {
              child.material.color.multiplyScalar(1.38);
            }
            
            // Sparkling environment reflections for glass facets
            child.material.envMapIntensity = 3.2;
            child.material.roughness = Math.min(child.material.roughness, 0.14);
            child.material.metalness = Math.max(child.material.metalness, 0.56);
            
            // Warm golden internal radiance to ensure clear visibility in all ambient lighting
            child.material.emissive = new THREE.Color(0x3d2c14);
            child.material.emissiveIntensity = 0.40;
            child.material.needsUpdate = true;
          }
        }
      }
    });
    return s;
  }, [gltf.scene]);

  // Smooth continuous rotation animation on every frame
  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <group ref={modelRef} scale={[scaleVal, scaleVal, scaleVal]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 4. MAIN EXPORT: 3D BOTTLE CANVAS & LUMINOUS STUDIO RIG
// ============================================================================
export function Bottle3D({ isCompact = false }: { isCompact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch devices to completely disable touch interactions on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    }
  }, []);

  // Crisp Retina DPR ([1, 2]) on all screens so the bottle is razor sharp with zero pixelation
  const dpr: [number, number] = [1, 2];

  // Automatically pause the WebGL render loop when the hero bottle is off-screen.
  // This frees up 100% of GPU resources when scrolling the product catalog or navigating other pages.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
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
      style={{ touchAction: isNonInteractive ? "auto" : "none" }}
    >
      <Canvas
        frameloop={isInView ? "always" : "never"}
        dpr={dpr}
        camera={{ position: [0, 0, 3.85], fov: isCompact ? 39 : 38 }}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.60
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        {/* Ambient base illumination */}
        <ambientLight intensity={2.3} />
        
        {/* Front Key Light */}
        <directionalLight position={[4, 8, 6]} intensity={2.9} color="#ffffff" />
        
        {/* Warm Gold Accent Fill Light */}
        <directionalLight position={[-5, 5, 5]} intensity={2.2} color="#fff6e8" />
        
        {/* Rim Contour Backlight */}
        <directionalLight position={[0, 6, -6]} intensity={2.5} color="#ffffff" />
        
        {/* Front Direct Spot Glow */}
        <pointLight position={[0, 1.5, 3.5]} intensity={2.8} color="#ffffff" distance={15} />
        
        {/* Base Pedestal Uplight */}
        <pointLight position={[0, -2.5, 2.5]} intensity={2.0} color="#ffe8b8" distance={12} />

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

        {/* Gentle floating micro-animation */}
        <Suspense fallback={<Loader />}>
          <Float speed={1.2} rotationIntensity={0.025} floatIntensity={0.025}>
            <Model isCompact={isCompact} />
          </Float>
        </Suspense>

        {/* Interactive orbit controls (strictly desktop with mouse; completely disabled and unmounted on mobile/touch) */}
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
