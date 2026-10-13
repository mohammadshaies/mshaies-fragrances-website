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
            // Restore authentic original bottle colors and textures (no artificial color tinting)
            if (origMat.color) {
              mat.color = origMat.color.clone();
            }
            mat.envMapIntensity = 2.8;
            mat.roughness = 0.15;
            mat.metalness = 0.58;
            // Warm golden internal radiance to ensure clear visibility
            mat.emissive = new THREE.Color(0x382810);
            mat.emissiveIntensity = 0.35;

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

  // Silky smooth continuous rotation on every frame
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

  // Optimized DPR: 1.25 on mobile gives sharp Retina clarity with zero lag; 1.5 on desktop
  const dpr: [number, number] = isCompact || isTouchDevice ? [1, 1.25] : [1, 1.5];

  // Pause WebGL rendering as soon as hero scrolls out of view (0% background GPU consumption)
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
          toneMappingExposure: 1.55,
        }}
        style={{ pointerEvents: isNonInteractive ? "none" : "auto" }}
      >
        {/* Ambient base illumination */}
        <ambientLight intensity={2.0} color="#ffffff" />
        
        {/* Front Key Light */}
        <directionalLight position={[4, 8, 6]} intensity={2.8} color="#ffffff" />
        
        {/* Warm Gold Accent Fill Light */}
        <directionalLight position={[-5, 5, 5]} intensity={2.0} color="#fff6e8" />
        
        {/* Rim Contour Backlight */}
        <directionalLight position={[0, 6, -6]} intensity={2.2} color="#ffffff" />

        {/* Front Direct Spot Glow */}
        <pointLight position={[0, 1.5, 3.5]} intensity={2.4} color="#ffffff" distance={15} />
        
        {/* Base Pedestal Uplight */}
        <pointLight position={[0, -2.5, 2.5]} intensity={1.8} color="#ffe8b8" distance={12} />

        {/* Multi-Panel Studio Environment (frames=1 bakes cubemap once) */}
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
