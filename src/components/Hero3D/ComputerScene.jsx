import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ComputerModel from "./ComputerModel";
import Screen from "./Screen";

export default function ComputerScene({ progressRef, mouseRef, bootRef, isMobile, prefersReducedMotion, modelUrl }) {
  const groupRef = useRef();

  // Quem se move com o scroll é a câmera (CameraController). O setup só
  // inclina de leve com o mouse e flutua devagar — a tela fica sempre legível.
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const mouse = mouseRef?.current ?? { x: 0, y: 0 };
    const mouseTilt = prefersReducedMotion ? 0 : 0.1;

    const damp = 1 - Math.pow(0.0025, delta);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, mouse.y * mouseTilt * -1, damp);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * mouseTilt, damp);
    groupRef.current.position.y = -0.3 + (prefersReducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.02);
  });

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      <ComputerModel modelUrl={modelUrl} isMobile={isMobile} progressRef={progressRef} bootRef={bootRef} />
      <Screen progressRef={progressRef} bootRef={bootRef} />
    </group>
  );
}
