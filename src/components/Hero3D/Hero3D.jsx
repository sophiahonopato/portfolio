import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Environment, Lightformer, Grid } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import gsap from "gsap";
import ComputerScene from "./ComputerScene";
import CameraController from "./CameraController";
import "./style.css";

// mesma cor de --bg no index.css: o hero emenda no resto da página sem costura
const NIGHT = "#050D16";

export default function Hero3D({
  progressRef,
  mouseRef,
  isMobile = false,
  prefersReducedMotion = false,
  modelUrl = null,
}) {
  const highQuality = !isMobile && !prefersReducedMotion;

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, 1.5);
  }, []);

  // Sequência de boot: 0 → 1 uma única vez ao montar. Câmera, luzes, teclado
  // e tela leem esse valor a cada frame (sem re-render do React).
  const bootRef = useRef({ v: 0 });
  useEffect(() => {
    const tween = gsap.to(bootRef.current, { v: 1, duration: 2.8, ease: "power2.inOut", delay: 0.2 });
    return () => tween.kill();
  }, []);

  // Pausa o render do WebGL quando o hero sai da tela: o resto da página
  // rola sem a cena 3D consumindo GPU/bateria em segundo plano.
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    // margem: volta a renderizar um pouco antes de o hero reaparecer
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "25% 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hero3d" ref={wrapRef}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 6], fov: 35, near: 0.1, far: 100 }}
      >
        <Atmosphere bootRef={bootRef} isMobile={isMobile} />

        <CameraController
          progressRef={progressRef}
          mouseRef={mouseRef}
          bootRef={bootRef}
          prefersReducedMotion={prefersReducedMotion}
        />

        <Suspense fallback={null}>
          <ComputerScene
            progressRef={progressRef}
            mouseRef={mouseRef}
            bootRef={bootRef}
            isMobile={isMobile}
            prefersReducedMotion={prefersReducedMotion}
            modelUrl={modelUrl}
          />
        </Suspense>

        {/* Piso em grid: dá chão e profundidade à plataforma flutuante */}
        <Grid
          position={[0, -1.35, 0]}
          infiniteGrid
          cellSize={0.45}
          cellThickness={0.6}
          cellColor="#123049"
          sectionSize={2.25}
          sectionThickness={1.1}
          sectionColor="#2C86B8"
          fadeDistance={isMobile ? 22 : 16}
          fadeStrength={2.5}
        />

        {!prefersReducedMotion && (
          <Sparkles
            count={isMobile ? 30 : 80}
            scale={[7, 3.5, 5]}
            position={[0, 0.3, 0]}
            size={isMobile ? 1.6 : 2.2}
            speed={0.25}
            color="#7DD3FC"
            opacity={0.7}
          />
        )}

        {highQuality && (
          <EffectComposer multisampling={4}>
            <Bloom intensity={1} luminanceThreshold={0.42} luminanceSmoothing={0.25} mipmapBlur radius={0.75} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

/* Fundo, neblina e luzes. As luzes acendem junto com o boot. */
function Atmosphere({ bootRef, isMobile }) {
  const ambient = useRef();
  const key = useRef();
  const rimBlue = useRef();
  const rimViolet = useRef();

  useFrame(({ camera, scene }) => {
    const boot = bootRef.current.v;

    // a neblina começa sempre depois do setup, por mais longe que a câmera esteja
    const distance = camera.position.length();
    scene.fog.near = Math.max(7, distance + 2.5);
    scene.fog.far = scene.fog.near + 12;

    ambient.current.intensity = 0.25 * (0.25 + 0.75 * boot);
    key.current.intensity = 0.9 * boot;
    rimBlue.current.intensity = 26 * boot;
    rimViolet.current.intensity = 18 * boot;
  });

  return (
    <>
      <color attach="background" args={[NIGHT]} />
      {/* no mobile a câmera fica mais longe, então a neblina começa mais atrás */}
      <fog attach="fog" args={[NIGHT, isMobile ? 12 : 7, isMobile ? 30 : 18]} />

      <ambientLight ref={ambient} intensity={0} color="#BAE6FD" />
      {/* Reflexos de estúdio gerados aqui mesmo, sem baixar HDR de CDN externo:
          com um preset, a cena inteira ficava presa no "loading" enquanto (ou se)
          o arquivo remoto não chegasse. */}
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.55}>
        <color attach="background" args={["#04080D"]} />
        <Lightformer form="rect" intensity={2.2} color="#EAF7FF" position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[9, 3, 1]} />
        <Lightformer form="rect" intensity={3} color="#4DB8F2" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={3} color="#8B7CFF" position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 1.5, 8]} rotation-y={Math.PI} scale={[7, 2, 1]} />
      </Environment>

      <directionalLight ref={key} position={[2, 5, 4]} intensity={0} color="#EAF7FF" />
      {/* luzes de recorte: separam o setup escuro do fundo escuro */}
      <pointLight ref={rimBlue} position={[-3.2, 1.6, -1.8]} intensity={0} color="#4DB8F2" distance={9} decay={1.8} />
      <pointLight ref={rimViolet} position={[3.4, 1.2, -2.2]} intensity={0} color="#8B7CFF" distance={9} decay={1.8} />
    </>
  );
}
