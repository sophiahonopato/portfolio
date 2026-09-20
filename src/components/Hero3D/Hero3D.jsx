import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, Environment, ContactShadows, SoftShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import ComputerScene from "./ComputerScene";
import CameraController from "./CameraController";
import "./style.css";

export default function Hero3D({
  progressRef,
  mouseRef,
  isMobile = false,
  prefersReducedMotion = false,
  modelUrl = null,
}) {
  // MUDOU: no mobile usa até 1.5 (antes era 1 fixo)
  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    const max = isMobile ? 1.5 : 2;
    return Math.min(window.devicePixelRatio || 1, max);
  }, [isMobile]);

  const highQuality = !isMobile && !prefersReducedMotion;

  return (
    <div className="hero3d">
      <Canvas
        dpr={dpr}
        shadows={highQuality}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} // MUDOU: antialias sempre ligado
        camera={{ position: [0, 0.4, 6], fov: 35, near: 0.1, far: 100 }}
      >
        <color attach="background" args={["#F7FAFC"]} />
        {/* MUDOU: no mobile a câmera fica mais longe, então a neblina começa mais atrás */}
        <fog attach="fog" args={["#F7FAFC", isMobile ? 14 : 8, isMobile ? 30 : 16]} />

        {highQuality && <SoftShadows size={18} samples={12} focus={0.6} />}

        {/* Luz ambiente + reflexos de estúdio para dar profundidade e brilho ao metal/vidro */}
        <ambientLight intensity={0.4} color="#EAF7FF" />
        <Environment preset="city" background={false} environmentIntensity={highQuality ? 0.6 : 0.35} />

        <pointLight position={[3, 4, 4]} intensity={1.1} color="#BAE6FD" castShadow={highQuality} />
        <pointLight position={[-4, 1.5, 2]} intensity={0.5} color="#4DB8F2" />
        {/* Luz de recorte (rim light) para separar o computador do fundo */}
        <pointLight position={[-2, 2.5, -3]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[0, 6, 3]} intensity={0.4} color="#ffffff" castShadow={highQuality} />

        <CameraController
          progressRef={progressRef}
          mouseRef={mouseRef}
          prefersReducedMotion={prefersReducedMotion}
        />

        <Suspense fallback={null}>
          <ComputerScene
            progressRef={progressRef}
            mouseRef={mouseRef}
            isMobile={isMobile}
            prefersReducedMotion={prefersReducedMotion}
            modelUrl={modelUrl}
          />
        </Suspense>

        {highQuality && (
          <ContactShadows
            position={[0, -1.16, 0]}
            opacity={0.45}
            scale={8}
            blur={2.4}
            far={2}
            color="#071522"
          />
        )}

        {!isMobile && !prefersReducedMotion && (
          <Sparkles count={40} scale={[6, 3, 4]} size={1.4} speed={0.15} color="#7DD3FC" opacity={0.35} />
        )}

        {highQuality && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.35}
              luminanceThreshold={0.65}
              luminanceSmoothing={0.15}
              mipmapBlur
              radius={0.5}
            />
            <Vignette eskil={false} offset={0.15} darkness={0.5} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}