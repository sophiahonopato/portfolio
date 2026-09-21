import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber"; // MUDOU: importa useThree
import * as THREE from "three";
import ComputerModel from "./ComputerModel";
import Screen from "./Screen";


const PORTRAIT_SCALE = 0.8;


export const STAGES = [
  { id: "start", from: 0, to: 0.15 },
  { id: "wake", from: 0.15, to: 0.32 },
  { id: "orbit", from: 0.32, to: 0.5 },
  { id: "code", from: 0.5, to: 0.68 },
  { id: "whoami", from: 0.68, to: 0.85 },
  { id: "projects", from: 0.85, to: 1.0 },
];

export function getStage(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return STAGES.find((s) => p >= s.from && p <= s.to) || STAGES[STAGES.length - 1];
}

export function getLocalProgress(progress, stage) {
  const span = stage.to - stage.from || 1;
  return Math.min(1, Math.max(0, (progress - stage.from) / span));
}

export default function ComputerScene({ progressRef, mouseRef, isMobile, prefersReducedMotion, modelUrl }) {
  const groupRef = useRef();
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));
  const targetPosition = useRef(new THREE.Vector3(0, -0.3, 0));

  // MUDOU: detecta tela em pé (só re-renderiza quando a janela muda de tamanho)
  const size = useThree((s) => s.size);
  const portrait = size.width / size.height < 1;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const progress = progressRef?.current ?? 0;
    const mouse = mouseRef?.current ?? { x: 0, y: 0 };
    const stage = getStage(progress);
    const isPortraitNow = state.size.width / state.size.height < 1;

    // rotação geral acompanhando o scroll (orbita durante "orbit", desloca em "whoami"/"projects")
    let rotY = THREE.MathUtils.degToRad(progress * 55);
    let posX = 0;

    if (!isPortraitNow && (stage.id === "whoami" || stage.id === "projects")) {
      const local = getLocalProgress(progress, stage);
      posX = THREE.MathUtils.lerp(0, stage.id === "whoami" ? -1.1 : -1.8, local);
      rotY += THREE.MathUtils.degToRad(local * 20);
    }

    const mouseTilt = prefersReducedMotion ? 0 : 0.12;
    targetRotation.current.set(mouse.y * mouseTilt * -1, rotY + mouse.x * mouseTilt, 0);
    targetPosition.current.set(posX, -0.3, 0);

    const damp = 1 - Math.pow(0.0025, delta);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, damp);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, damp);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPosition.current.x, damp);
  });

  return (
    // MUDOU: scale menor em tela em pé
    <group ref={groupRef} position={[0, -0.3, 0]} scale={portrait ? PORTRAIT_SCALE : 1}>
      <ComputerModel modelUrl={modelUrl} isMobile={isMobile} />
      <Screen progressRef={progressRef} />
    </group>
  );
}