import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { getStage } from "./stages";
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

// A área útil da tela no modelo mede 1.72 × 0.98 (ver ComputerModel).
// No <Html transform> do drei, 400px equivalem a 10 unidades com scale 1,
// então este scale faz os 400px do .hero3d-screen ocuparem exatamente 1.72.
const SCREEN_SCALE = 1.72 / 10;

const FADE_START_DEG = 35;
const FADE_END_DEG = 55;
const UNMOUNT_DEG = FADE_END_DEG + 5;

// A tela só "liga" depois que o boot passa deste ponto
const POWER_ON_AT = 0.45;
const MS_PER_CHAR = 24;

// Realce de sintaxe mínimo para as linhas do terminal
const TOKEN_RE = /("[^"]*"|^> ?|\b(?:const|cat)\b|\[ [A-Z-]+ \])/g;

function renderLine(line) {
  return line.split(TOKEN_RE).map((part, i) => {
    if (!part) return null;
    let type = null;
    if (part.startsWith('"')) type = "str";
    else if (part.startsWith(">")) type = "prompt";
    else if (part === "const" || part === "cat") type = "kw";
    else if (part.startsWith("[ ")) type = "tag";
    return type ? (
      <span key={i} className={`hero3d-tok hero3d-tok--${type}`}>
        {part}
      </span>
    ) : (
      part
    );
  });
}

export default function Screen({ progressRef, bootRef }) {
  const [stageId, setStageId] = useState("start");
  const [isFacingCamera, setIsFacingCamera] = useState(true);
  const [isOn, setIsOn] = useState(false);
  const lastStageRef = useRef("start");
  const lastFacingRef = useRef(true);
  const lastOnRef = useRef(false);

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

    const on = (bootRef?.current?.v ?? 1) >= POWER_ON_AT;
    if (on !== lastOnRef.current) {
      lastOnRef.current = on;
      setIsOn(on);
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

  // cada linha "digita" depois da anterior
  let typedSoFar = 0;

  return (
    <group ref={anchorRef} position={[0, 0.55, 0.052]}>
      {isFacingCamera && isOn && (
        <Html transform scale={SCREEN_SCALE} occlude={false} style={{ pointerEvents: "none" }}>
          <div ref={contentRef} style={{ transition: "opacity 0.15s linear" }}>
            <div className="hero3d-screen">
              {stageId === "start" ? (
                <div className="hero3d-identity" key={stageId}>
                  <span className="hero3d-identity__eyebrow">Creative Developer</span>
                  {/* o <h1> real (acessível) fica no Hero.jsx */}
                  <p className="hero3d-identity__name" aria-hidden="true">
                    <span>Sophia</span>
                    <span>Honorato</span>
                  </p>
                  <span className="hero3d-identity__meta">React · JavaScript · GSAP · Web</span>
                </div>
              ) : (
                <div className="hero3d-terminal" key={stageId} aria-hidden="true">
                  <div className="hero3d-terminal__bar">
                    <i />
                    <i />
                    <i />
                    <span>sophia@portfolio — {stageId}</span>
                  </div>
                  {lines.map((line, i) => {
                    const delay = typedSoFar * MS_PER_CHAR;
                    typedSoFar += line.length + 4;
                    return (
                      <p
                        key={i}
                        className="hero3d-screen__line"
                        style={{
                          animationDelay: `${delay}ms`,
                          animationDuration: `${Math.max(1, line.length) * MS_PER_CHAR}ms`,
                          animationTimingFunction: `steps(${Math.max(1, line.length)})`,
                        }}
                      >
                        {line ? renderLine(line) : " "}
                      </p>
                    );
                  })}
                  <span className="hero3d-screen__cursor" />
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
