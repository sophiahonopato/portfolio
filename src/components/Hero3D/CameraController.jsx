import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Keyframes de câmera por estágio do scroll (progress 0 → 1)
// p:    progresso
// look: ponto para onde a câmera olha
// dir:  direção alvo → câmera (só o ângulo importa; a distância é calculada)
// fitW: largura (unidades do mundo) que PRECISA caber na tela — é o que manda no celular em pé
// fitH: altura que PRECISA caber na tela — é o que manda no desktop
//
// A distância sai do enquadramento, não de um valor fixo: assim o monitor
// ocupa a mesma proporção da tela em qualquer formato (celular, tablet, ultrawide).
// Nos estágios com texto, o ângulo fica abaixo de ~30° do eixo do monitor para a tela continuar legível.
const CAMERA_PATH = [
  { p: 0.0, look: [0, 0.2, 0], dir: [0, 0.06, 1], fitW: 2.15, fitH: 1.95 }, // START (monitor em destaque)
  { p: 0.18, look: [0, 0.0, 0.25], dir: [0.14, 0.22, 1], fitW: 2.6, fitH: 2.25 }, // BOOT (revela o setup)
  { p: 0.38, look: [-0.1, 0.0, 0.2], dir: [0.56, 0.3, 0.9], fitW: 2.9, fitH: 2.4 }, // ORBITA
  { p: 0.5, look: [0.1, -0.52, 0.6], dir: [0.25, 0.75, 1], fitW: 1.5, fitH: 1.05 }, // rasante no teclado
  { p: 0.62, look: [0, 0.25, 0], dir: [0.06, 0.05, 1], fitW: 2.0, fitH: 1.5 }, // CÓDIGO (close no monitor)
  { p: 0.82, look: [-0.25, 0.2, 0], dir: [-0.4, 0.1, 1], fitW: 2.3, fitH: 1.75 }, // WHOAMI (gabinete entra em cena)
  { p: 1.0, look: [0.1, 0.0, 0.2], dir: [-0.3, 0.26, 1], fitW: 3.0, fitH: 2.3 }, // PROJECTS
];

const LANDSCAPE_FOV = 35;
// Em retrato a largura é o limite, então um FOV mais aberto evita a câmera ir longe demais
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
    look: lerp3(a.look, b.look),
    dir: lerp3(a.dir, b.dir),
    fitW: THREE.MathUtils.lerp(a.fitW, b.fitW, eased),
    fitH: THREE.MathUtils.lerp(a.fitH, b.fitH, eased),
  };
}

export default function CameraController({ progressRef, mouseRef, bootRef, prefersReducedMotion }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0.4, 6));
  const targetLook = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0.2, 0));
  const offset = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame((state, delta) => {
    const progress = progressRef?.current ?? 0;
    const mouse = mouseRef?.current ?? { x: 0, y: 0 };
    const boot = bootRef?.current?.v ?? 1;
    const t = state.clock.elapsedTime;
    const { look, dir, fitW, fitH } = sampleCameraPath(progress);

    const aspect = state.size.width / state.size.height;
    const targetFov = aspect < 1 ? PORTRAIT_FOV : LANDSCAPE_FOV;

    // distância mínima para fitW × fitH caberem na tela:
    //   altura visível  = 2 * d * tan(fov/2)
    //   largura visível = altura visível * aspect
    const halfTan = Math.tan(THREE.MathUtils.degToRad(targetFov / 2));
    const distance = Math.max(fitH / (2 * halfTan), fitW / (2 * halfTan * aspect));

    // Boot: a câmera nasce afastada, baixa e de lado, e "pousa" no enquadramento
    const intro = 1 - boot;
    offset.current
      .set(dir[0] + intro * 0.55, dir[1] - intro * 0.12, dir[2])
      .normalize()
      .multiplyScalar(distance * (1 + intro * 0.7));

    // parallax do mouse (o mouseRef fica zerado em touch) + respiração lenta
    const mouseInfluence = prefersReducedMotion ? 0 : 0.35;
    const drift = prefersReducedMotion ? 0 : 0.035;
    targetPos.current.set(
      look[0] + offset.current.x + mouse.x * mouseInfluence + Math.sin(t * 0.45) * drift,
      look[1] + offset.current.y + mouse.y * (mouseInfluence * 0.5) + Math.cos(t * 0.6) * drift,
      look[2] + offset.current.z
    );
    targetLook.current.set(look[0] + mouse.x * mouseInfluence * 0.4, look[1], look[2]);

    // primeiro frame: já nasce enquadrado, sem "voar" da posição padrão
    const damp = initialized.current ? 1 - Math.pow(0.001, delta) : 1;
    initialized.current = true;

    camera.position.lerp(targetPos.current, damp);
    currentLook.current.lerp(targetLook.current, damp);
    camera.lookAt(currentLook.current);

    const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, damp);
    if (Math.abs(camera.fov - nextFov) > 0.001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
