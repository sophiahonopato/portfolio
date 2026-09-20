import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Keyframes de câmera por estágio do scroll (progress 0 → 1)
// p: progresso | pos: posição da câmera | look: alvo do lookAt
// fit: largura (em unidades do mundo) que PRECISA caber na tela em retrato.
//      Só é usada quando aspect < 1 (celular em pé).
const CAMERA_PATH = [
  { p: 0.0, pos: [0, 0.4, 6], look: [0, 0.2, 0], fit: 3.6 }, // START (mesa inteira)
  { p: 0.18, pos: [0.4, 0.6, 5], look: [0, 0.2, 0], fit: 3.6 }, // ACORDANDO
  { p: 0.4, pos: [2.2, 0.9, 3.4], look: [0, 0.1, 0], fit: 3.9 }, // ORBITA (mesa girando ocupa mais)
  { p: 0.62, pos: [0.3, 0.35, 1.6], look: [0, 0.28, 0.2], fit: 2.0 }, // MONITOR/CÓDIGO (só o monitor)
  { p: 1.0, pos: [-2.4, 0.7, 4.6], look: [0.6, 0.1, 0], fit: 3.6 }, // PROJECTS
];

// FOV base e distância de referência usadas para o dolly-zoom no desktop
const BASE_FOV = 35;
const BASE_DISTANCE = CAMERA_PATH[0].pos[2];

// Em retrato usamos um FOV fixo e mais aberto (sem dolly-zoom):
// o que decide o tamanho do objeto passa a ser a largura da tela.
const PORTRAIT_FOV = 50;

function sampleCameraPath(t) {
  const clamped = Math.min(1, Math.max(0, t));
  let a = CAMERA_PATH[0];
  let b = CAMERA_PATH[CAMERA_PATH.length - 1];

  for (let i = 0; i < CAMERA_PATH.length - 1; i++) {
    if (clamped >= CAMERA_PATH[i].p && clamped <= CAMERA_PATH[i + 1].p) {
      a = CAMERA_PATH[i];
      b = CAMERA_PATH[i + 1];
      break;
    }
  }

  const span = b.p - a.p || 1;
  const localT = (clamped - a.p) / span;
  // easing suave (easeInOutSine)
  const eased = -(Math.cos(Math.PI * localT) - 1) / 2;

  const lerp3 = (from, to) => [
    THREE.MathUtils.lerp(from[0], to[0], eased),
    THREE.MathUtils.lerp(from[1], to[1], eased),
    THREE.MathUtils.lerp(from[2], to[2], eased),
  ];

  return {
    pos: lerp3(a.pos, b.pos),
    look: lerp3(a.look, b.look),
    fit: THREE.MathUtils.lerp(a.fit, b.fit, eased),
  };
}

// FOV que mantém o tamanho aparente do objeto ~constante (dolly-zoom) — desktop
function computeCompensatedFov(distance) {
  const baseHalfFovRad = THREE.MathUtils.degToRad(BASE_FOV / 2);
  const newHalfFovRad = Math.atan(
    (Math.tan(baseHalfFovRad) * BASE_DISTANCE) / Math.max(distance, 0.1)
  );
  const newFovDeg = THREE.MathUtils.radToDeg(newHalfFovRad) * 2;
  return THREE.MathUtils.clamp(newFovDeg, 18, 65);
}

export default function CameraController({ progressRef, mouseRef, prefersReducedMotion }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0.4, 6));
  const targetLook = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentFov = useRef(BASE_FOV);
  const offset = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const progress = progressRef?.current ?? 0;
    const mouse = mouseRef?.current ?? { x: 0, y: 0 };
    const { pos, look, fit } = sampleCameraPath(progress);

    const aspect = state.size.width / state.size.height;
    const isPortrait = aspect < 1;

    const mouseInfluence = prefersReducedMotion ? 0 : 0.35;

    let targetFov;

    if (isPortrait) {
      // 1) mantém o objeto centralizado (sem o deslocamento lateral do desktop)
      const lookX = 0;

      // 2) direção câmera → alvo, preservando o "ângulo" de cada keyframe
      offset.current.set(pos[0] - lookX, pos[1] - look[1], pos[2] - look[2]);
      const pathDistance = offset.current.length();

      // 3) distância mínima para a largura `fit` caber na tela:
      //    largura visível = 2 * d * tan(fov/2) * aspect
      const halfTan = Math.tan(THREE.MathUtils.degToRad(PORTRAIT_FOV / 2));
      const fitDistance = fit / (2 * halfTan * aspect);

      offset.current.normalize().multiplyScalar(Math.max(pathDistance, fitDistance));

      targetPos.current.set(
        lookX + offset.current.x,
        look[1] + offset.current.y,
        look[2] + offset.current.z
      );
      targetLook.current.set(lookX, look[1], look[2]);
      targetFov = PORTRAIT_FOV;
    } else {
      targetPos.current.set(
        pos[0] + mouse.x * mouseInfluence,
        pos[1] + mouse.y * (mouseInfluence * 0.5),
        pos[2]
      );
      targetLook.current.set(look[0] + mouse.x * mouseInfluence * 0.4, look[1], look[2]);
      targetFov = null; // calculado depois, com a distância real
    }

    // damping independente de frame-rate
    const damp = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetPos.current, damp);
    currentLook.current.lerp(targetLook.current, damp);
    camera.lookAt(currentLook.current);

    if (targetFov === null) {
      const distance = camera.position.distanceTo(currentLook.current);
      targetFov = computeCompensatedFov(distance);
    }
    currentFov.current = THREE.MathUtils.lerp(currentFov.current, targetFov, damp);

    if (Math.abs(camera.fov - currentFov.current) > 0.001) {
      camera.fov = currentFov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}