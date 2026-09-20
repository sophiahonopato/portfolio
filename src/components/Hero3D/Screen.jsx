import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { getStage } from "./ComputerScene";
import "./style.css";

const CONTENT = {
  wake: ["> initializing...", "> loading projects...", "> loading skills...", "> loading journey...", "> ready."],
  orbit: ["> rotating environment...", "> perspective: 360°"],
  code: [
    "const Sophia = {",
    '  focus: "technology",',
    '  stack: ["React", "JavaScript", "CSS"],',
    '  mindset: "always building"',
    "}",
  ],
  whoami: ["> cat about-me.js", "", "curious", "creative", "tech-driven", "always building"],
  projects: ["PROJECT STORE", "", "[ ALL ]  [ WEB ]", "[ REACT ]  [ E-COMMERCE ]", "[ CREATIVE ]"],
};

const FADE_START_DEG = 35;
const FADE_END_DEG = 55;
const UNMOUNT_DEG = FADE_END_DEG + 5;

export default function Screen({ progressRef }) {
  const [stageId, setStageId] = useState("start");
  const [isFacingCamera, setIsFacingCamera] = useState(true);
  const lastStageRef = useRef("start");
  const lastFacingRef = useRef(true);

  const { camera } = useThree();
  const anchorRef = useRef();
  const contentRef = useRef();

  const forward = useRef(new THREE.Vector3());
  const toCamera = useRef(new THREE.Vector3());
  const worldPos = useRef(new THREE.Vector3());
  const worldQuat = useRef(new THREE.Quaternion());

  useFrame(() => {
    const progress = progressRef?.current ?? 0;
    const stage = getStage(progress).id;
    if (stage !== lastStageRef.current) {
      lastStageRef.current = stage;
      setStageId(stage);
    }

    if (!anchorRef.current) return;

    anchorRef.current.getWorldQuaternion(worldQuat.current);
    forward.current.set(0, 0, 1).applyQuaternion(worldQuat.current);

    anchorRef.current.getWorldPosition(worldPos.current);
    toCamera.current.subVectors(camera.position, worldPos.current).normalize();

    const angleDeg = THREE.MathUtils.radToDeg(forward.current.angleTo(toCamera.current));

    // desmonta/remonta o <Html> só quando cruza o limite de segurança
    // (evita re-render a cada frame — só quando o estado realmente muda)
    const shouldFace = angleDeg < UNMOUNT_DEG;
    if (shouldFace !== lastFacingRef.current) {
      lastFacingRef.current = shouldFace;
      setIsFacingCamera(shouldFace);
    }

    // opacidade contínua aplicada só enquanto o elemento existe no DOM
    if (contentRef.current) {
      const t = THREE.MathUtils.clamp(
        (angleDeg - FADE_START_DEG) / (FADE_END_DEG - FADE_START_DEG),
        0,
        1
      );
      contentRef.current.style.opacity = (1 - t).toString();
    }
  });

  const lines = CONTENT[stageId];

  return (
    <group ref={anchorRef} position={[0, 0.55, 0.052]}>
      {isFacingCamera && (
        <Html transform position={[0, 0, 0]} scale={0.47} occlude={false} style={{ pointerEvents: "none" }}>
  <div ref={contentRef} className="hero3d-screen" style={{ transition: "opacity 0.15s linear" }}>
    {stageId === "start" ? (
      <div className="hero3d-identity" key={stageId}>
        <span className="hero3d-identity__eyebrow">Creative Developer</span>
        <h1 className="hero3d-identity__name">
          <span>Sophia</span>
          <span>Honorato</span>
        </h1>
        <span className="hero3d-identity__meta">React · JavaScript · GSAP · Web</span>
      </div>
    ) : (
      <div key={stageId}>
        {lines.map((line, i) => (
          <p key={i} className="hero3d-screen__line" style={{ animationDelay: `${i * 90}ms` }}>
            {line || "\u00A0"}
          </p>
        ))}
        <span className="hero3d-screen__cursor" />
      </div>
    )}
  </div>
</Html>
      )}
    </group>
  );
}