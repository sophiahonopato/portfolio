import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { getStage } from "./stages";

/**
 * ComputerModel
 * Se `modelUrl` for passado (ex: "/models/computer.glb"), carrega o modelo
 * externo via GLTF. Caso contrário, renderiza o setup construído em
 * primitivas: monitor com light bar, teclado RGB tecla a tecla, mouse,
 * gabinete com lateral de vidro e fans, tudo sobre uma plataforma com LED.
 *
 * Coordenadas (dentro do grupo): centro do monitor em y = 0.55 e área útil
 * da tela de 1.72 × 0.98 — é nela que o Screen.jsx encaixa o HTML.
 */
export default function ComputerModel({ modelUrl, isMobile, progressRef, bootRef }) {
  if (modelUrl) {
    return <GLTFComputer url={modelUrl} />;
  }
  return <PrimitiveComputer isMobile={isMobile} progressRef={progressRef} bootRef={bootRef} />;
}

function GLTFComputer({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

const ACCENT = new THREE.Color("#4DB8F2");
const ACCENT_HOT = new THREE.Color("#9BE1FF");
const VIOLET = new THREE.Color("#8B7CFF");

const DESK_TOP = -0.4; // altura do tampo da mesa

const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

function PrimitiveComputer({ isMobile, progressRef, bootRef }) {
  const segments = isMobile ? 16 : 32;

  // Materiais compartilhados. Os "glow" são básicos e sem tone mapping: é o
  // que o Bloom enxerga. A cor deles é multiplicada pela energia do boot a cada frame.
  const mats = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({ color: "#101D2A", roughness: 0.32, metalness: 0.75 });
    const bodyDark = new THREE.MeshStandardMaterial({ color: "#08121C", roughness: 0.5, metalness: 0.6 });
    const desk = new THREE.MeshStandardMaterial({ color: "#0A1520", roughness: 0.42, metalness: 0.45 });
    const mat = new THREE.MeshStandardMaterial({ color: "#0C2233", roughness: 0.85, metalness: 0.1 });
    const screenOff = new THREE.MeshStandardMaterial({ color: "#040B12", roughness: 0.12, metalness: 0.3 });
    const blade = new THREE.MeshStandardMaterial({
      color: "#28506E",
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#9FD8FF",
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ceramic = new THREE.MeshStandardMaterial({ color: "#EAF7FF", roughness: 0.35, metalness: 0.05 });
    const glow = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const underGlow = new THREE.MeshBasicMaterial({
      color: ACCENT,
      toneMapped: false,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // Halos: sprites com gradiente radial e blending aditivo. Fazem o papel do
    // bloom sem pós-processamento (a opacidade segue a energia do boot).
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const glowMap = new THREE.CanvasTexture(canvas);
    const halo = (color, opacity) => ({
      base: opacity,
      material: new THREE.SpriteMaterial({
        map: glowMap,
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    });

    return {
      halos: {
        screen: halo(ACCENT, 0.55),
        bar: halo(ACCENT_HOT, 0.5),
        caseSide: halo(VIOLET, 0.6),
        caseFront: halo(ACCENT, 0.4),
        keys: halo(VIOLET, 0.35),
        desk: halo(ACCENT, 0.3),
      },
      body,
      bodyDark,
      desk,
      mat,
      screenOff,
      blade,
      glass,
      ceramic,
      underGlow,
      glows: [
        { material: glow(ACCENT), base: ACCENT },
        { material: glow(ACCENT_HOT), base: ACCENT_HOT },
        { material: glow(VIOLET), base: VIOLET },
      ],
    };
  }, []);
  const [glowA, glowHot, glowV] = mats.glows.map((g) => g.material);

  // Estado animado compartilhado com os filhos (fans, teclado) sem re-render
  const live = useRef({ energy: 0, fanSpeed: 0, stage: "start" });
  const screenLight = useRef();
  const caseLight = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const boot = bootRef?.current?.v ?? 1;
    const stage = getStage(progressRef?.current ?? 0).id;

    // energia: sobe com o boot (piscando enquanto liga) e depois "respira"
    const flicker = boot < 1 ? 0.7 + 0.3 * Math.sin(t * 38) * Math.sin(t * 11) : 1;
    const breathe = 0.92 + 0.08 * Math.sin(t * 1.6);
    const energy = Math.pow(boot, 1.5) * flicker * breathe;

    live.current.energy = energy;
    live.current.stage = stage;
    live.current.fanSpeed = 1.5 + boot * (stage === "code" ? 16 : 9);

    for (const g of mats.glows) g.material.color.copy(g.base).multiplyScalar(0.04 + energy * 0.96);
    mats.underGlow.opacity = 0.22 * energy;
    for (const h of Object.values(mats.halos)) h.material.opacity = h.base * energy;
    if (screenLight.current) screenLight.current.intensity = 2.2 * energy;
    if (caseLight.current) caseLight.current.intensity = 1.6 * energy;
  });

  return (
    <group>
      {/* ---------- Monitor ---------- */}
      <group position={[0, 0.55, 0]}>
        {/* Moldura */}
        <RoundedBox args={[1.9, 1.15, 0.08]} radius={0.03} smoothness={4} material={mats.body} />
        {/* Carcaça traseira */}
        <RoundedBox args={[1.25, 0.72, 0.07]} radius={0.03} smoothness={4} position={[0, 0, -0.07]} material={mats.bodyDark} />

        {/* Halo fino em volta da tela — é ele que o Bloom pega */}
        <mesh position={[0, 0, 0.041]} material={glowA}>
          <planeGeometry args={[1.734, 0.994]} />
        </mesh>
        {/* Vidro da tela (o conteúdo real é o HTML do Screen.jsx, logo à frente) */}
        <mesh position={[0, 0, 0.045]} material={mats.screenOff}>
          <planeGeometry args={[1.72, 0.98]} />
        </mesh>

        {/* Ambilight: barras de LED atrás do monitor */}
        <mesh position={[0, 0.42, -0.1]} material={glowV}>
          <boxGeometry args={[1.5, 0.025, 0.02]} />
        </mesh>
        <mesh position={[0, -0.42, -0.1]} material={glowA}>
          <boxGeometry args={[1.5, 0.025, 0.02]} />
        </mesh>
        <mesh position={[-0.82, 0, -0.1]} material={glowA}>
          <boxGeometry args={[0.025, 0.8, 0.02]} />
        </mesh>
        <mesh position={[0.82, 0, -0.1]} material={glowV}>
          <boxGeometry args={[0.025, 0.8, 0.02]} />
        </mesh>

        {/* Light bar em cima do monitor */}
        <mesh position={[0, 0.605, 0.05]} rotation={[0, 0, Math.PI / 2]} material={mats.body}>
          <cylinderGeometry args={[0.022, 0.022, 0.8, segments]} />
        </mesh>
        <mesh position={[0, 0.584, 0.06]} material={glowHot}>
          <boxGeometry args={[0.74, 0.006, 0.012]} />
        </mesh>

        {/* halos: contorno de luz atrás do monitor e brilho da light bar */}
        <sprite position={[0, 0, -0.25]} scale={[3.6, 2.6, 1]} material={mats.halos.screen.material} />
        <sprite position={[0, 0.6, 0.1]} scale={[1.7, 0.4, 1]} material={mats.halos.bar.material} />

        {/* Luz que a tela joga no teclado/mesa */}
        <pointLight ref={screenLight} position={[0, -0.1, 0.55]} color="#4DB8F2" intensity={0} distance={2.6} decay={1.6} />

        {/* Pé */}
        <mesh position={[0, -0.74, -0.08]} rotation={[0.1, 0, 0]} material={mats.body}>
          <boxGeometry args={[0.11, 0.5, 0.035]} />
        </mesh>
        <RoundedBox args={[0.72, 0.025, 0.36]} radius={0.012} smoothness={4} position={[0, DESK_TOP - 0.55 + 0.013, -0.02]} material={mats.body} />
      </group>

      {/* ---------- Teclado ---------- */}
      <Keyboard position={[0, DESK_TOP + 0.03, 0.72]} mats={mats} live={live} bootRef={bootRef} />

      {/* halos do teclado e da borda da mesa */}
      <sprite position={[0, DESK_TOP + 0.1, 0.72]} scale={[1.7, 0.6, 1]} material={mats.halos.keys.material} />
      <sprite position={[0, DESK_TOP - 0.03, 1.24]} scale={[4.6, 0.5, 1]} material={mats.halos.desk.material} />

      {/* ---------- Mouse ---------- */}
      <group position={[0.82, DESK_TOP + 0.045, 0.74]} rotation={[0, 0.25, 0]}>
        <mesh scale={[0.075, 0.042, 0.115]} material={mats.body}>
          <sphereGeometry args={[1, segments, segments]} />
        </mesh>
        <mesh position={[0, 0.03, 0.055]} rotation={[0.5, 0, 0]} material={glowA}>
          <boxGeometry args={[0.012, 0.004, 0.05]} />
        </mesh>
        <mesh position={[0, -0.02, 0]} scale={[0.074, 0.006, 0.112]} material={glowV}>
          <sphereGeometry args={[1, segments, 8]} />
        </mesh>
      </group>

      {/* ---------- Gabinete ---------- */}
      <group position={[-1.6, DESK_TOP + 0.465, -0.12]} rotation={[0, -0.32, 0]}>
        {/* Corpo + moldura da janela lateral (cria a cavidade atrás do vidro) */}
        <RoundedBox args={[0.34, 0.9, 0.85]} radius={0.02} smoothness={4} position={[-0.03, 0, 0]} material={mats.body} />
        <mesh position={[0.17, 0.43, 0]} material={mats.body}>
          <boxGeometry args={[0.06, 0.04, 0.85]} />
        </mesh>
        <mesh position={[0.17, -0.43, 0]} material={mats.body}>
          <boxGeometry args={[0.06, 0.04, 0.85]} />
        </mesh>
        <mesh position={[0.17, 0, 0.405]} material={mats.body}>
          <boxGeometry args={[0.06, 0.9, 0.04]} />
        </mesh>
        <mesh position={[0.17, 0, -0.405]} material={mats.body}>
          <boxGeometry args={[0.06, 0.9, 0.04]} />
        </mesh>

        {/* Interior */}
        <mesh position={[0.142, 0, 0]} material={mats.bodyDark}>
          <boxGeometry args={[0.006, 0.82, 0.77]} />
        </mesh>
        {/* placa de vídeo */}
        <mesh position={[0.168, -0.12, 0.03]} material={mats.body}>
          <boxGeometry args={[0.045, 0.1, 0.52]} />
        </mesh>
        <mesh position={[0.193, -0.085, 0.03]} material={glowA}>
          <boxGeometry args={[0.008, 0.012, 0.48]} />
        </mesh>
        {/* memórias */}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[0.16, 0.2, 0.14 + i * 0.035]}>
            <mesh material={mats.bodyDark}>
              <boxGeometry args={[0.03, 0.18, 0.012]} />
            </mesh>
            <mesh position={[0.012, 0.095, 0]} material={i % 2 ? glowV : glowHot}>
              <boxGeometry args={[0.03, 0.012, 0.014]} />
            </mesh>
          </group>
        ))}
        {/* cooler */}
        <Fan position={[0.178, 0.2, -0.1]} rotation={[0, Math.PI / 2, 0]} radius={0.095} glow={glowV} mats={mats} live={live} />
        {/* fita de LED no fundo e no piso do gabinete */}
        <mesh position={[0.16, 0, -0.37]} material={glowV}>
          <boxGeometry args={[0.012, 0.76, 0.012]} />
        </mesh>
        <mesh position={[0.16, -0.395, 0]} material={glowA}>
          <boxGeometry args={[0.012, 0.012, 0.72]} />
        </mesh>
        <pointLight ref={caseLight} position={[0.3, 0, 0]} color="#8B7CFF" intensity={0} distance={1.6} decay={1.6} />

        {/* Vidro lateral */}
        <mesh position={[0.202, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.glass}>
          <planeGeometry args={[0.81, 0.86]} />
        </mesh>

        {/* Frente: três fans RGB */}
        <mesh position={[-0.03, 0, 0.4265]} material={mats.bodyDark}>
          <planeGeometry args={[0.3, 0.84]} />
        </mesh>
        {[0.28, 0, -0.28].map((y, i) => (
          <Fan key={y} position={[-0.03, y, 0.436]} radius={0.115} glow={i === 1 ? glowV : glowA} mats={mats} live={live} />
        ))}

        {/* halos do gabinete: interior (vidro) e fans da frente */}
        <sprite position={[0.26, 0, 0]} scale={[1.5, 1.5, 1]} material={mats.halos.caseSide.material} />
        <sprite position={[-0.03, 0, 0.5]} scale={[0.95, 1.6, 1]} material={mats.halos.caseFront.material} />

        {/* Botão de power */}
        <mesh position={[-0.03, 0.452, 0.3]} material={glowHot}>
          <cylinderGeometry args={[0.018, 0.018, 0.006, 20]} />
        </mesh>
      </group>

      {/* ---------- Caneca ---------- */}
      <group position={[1.42, DESK_TOP + 0.065, 0.15]}>
        <mesh material={mats.ceramic}>
          <cylinderGeometry args={[0.06, 0.052, 0.13, segments, 1, true]} />
        </mesh>
        <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.ceramic}>
          <circleGeometry args={[0.052, segments]} />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.056, segments]} />
          <meshStandardMaterial color="#2A1A12" roughness={0.3} />
        </mesh>
        <mesh position={[0.075, 0, 0]} rotation={[0, 0, 0]} material={mats.ceramic}>
          <torusGeometry args={[0.036, 0.009, 10, 24]} />
        </mesh>
      </group>

      {/* ---------- Plataforma / mesa ---------- */}
      <RoundedBox args={[3.9, 0.06, 1.85]} radius={0.025} smoothness={4} position={[0, DESK_TOP - 0.03, 0.3]} material={mats.desk} />
      {/* desk mat */}
      <mesh position={[0.15, DESK_TOP + 0.004, 0.74]} material={mats.mat}>
        <boxGeometry args={[2.3, 0.008, 0.72]} />
      </mesh>
      {/* LED na borda da plataforma */}
      <mesh position={[0, DESK_TOP - 0.03, 1.228]} material={glowA}>
        <boxGeometry args={[3.8, 0.012, 0.008]} />
      </mesh>
      <mesh position={[-1.953, DESK_TOP - 0.03, 0.3]} material={glowV}>
        <boxGeometry args={[0.008, 0.012, 1.75]} />
      </mesh>
      <mesh position={[1.953, DESK_TOP - 0.03, 0.3]} material={glowV}>
        <boxGeometry args={[0.008, 0.012, 1.75]} />
      </mesh>
      {/* brilho por baixo: a plataforma "flutua" sobre o grid */}
      <mesh position={[0, DESK_TOP - 0.075, 0.3]} rotation={[-Math.PI / 2, 0, 0]} material={mats.underGlow}>
        <planeGeometry args={[3.5, 1.5]} />
      </mesh>
    </group>
  );
}

/* Fan com anel de LED e pás girando; a velocidade vem do estado `live`. */
function Fan({ radius = 0.11, glow, mats, live, ...props }) {
  const blades = useRef();

  useFrame((_, delta) => {
    if (blades.current) blades.current.rotation.z -= delta * live.current.fanSpeed;
  });

  return (
    <group {...props}>
      <mesh material={glow}>
        <torusGeometry args={[radius, radius * 0.075, 8, 36]} />
      </mesh>
      <group ref={blades}>
        {Array.from({ length: 7 }).map((_, i) => (
          <group key={i} rotation={[0, 0, (i / 7) * Math.PI * 2]}>
            <mesh position={[0, radius * 0.52, 0]} rotation={[0, 0.5, 0.35]} material={mats.blade}>
              <boxGeometry args={[radius * 0.36, radius * 0.72, 0.006]} />
            </mesh>
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.bodyDark}>
          <cylinderGeometry args={[radius * 0.24, radius * 0.24, 0.02, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/* Teclado mecânico: cada tecla é uma instância com a própria luz.
   - no boot as teclas acendem da esquerda para a direita
   - depois corre uma onda RGB
   - nos estágios de "digitação" teclas aleatórias afundam e piscam */
const KEY_COLS = 14;
const KEY_ROWS = 5;
const KEY_PITCH = 0.072;
const KEY_COUNT = KEY_COLS * KEY_ROWS;
const TYPING_STAGES = new Set(["wake", "code", "whoami"]);

function Keyboard({ mats, live, bootRef, ...props }) {
  const capsRef = useRef();
  const lightsRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0A141E", roughness: 0.45, metalness: 0.4 }), []);
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), []);

  const keyX = (col) => (col - (KEY_COLS - 1) / 2) * KEY_PITCH;
  const keyZ = (row) => (row - (KEY_ROWS - 1) / 2) * KEY_PITCH;

  useLayoutEffect(() => {
    for (let i = 0; i < KEY_COUNT; i++) {
      dummy.position.set(keyX(i % KEY_COLS), 0.022, keyZ(Math.floor(i / KEY_COLS)));
      dummy.updateMatrix();
      lightsRef.current.setMatrixAt(i, dummy.matrix);
      lightsRef.current.setColorAt(i, color.set("#000000"));
    }
    lightsRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const boot = bootRef?.current?.v ?? 1;
    const { energy, stage } = live.current;
    const typing = TYPING_STAGES.has(stage) && boot >= 1;
    const beat = Math.floor(t * 11);

    for (let i = 0; i < KEY_COUNT; i++) {
      const col = i % KEY_COLS;
      const row = Math.floor(i / KEY_COLS);

      // tecla pressionada neste "beat"?
      const pressed = typing && (Math.floor(hash(beat) * KEY_COUNT) === i || Math.floor(hash(beat + 91.7) * KEY_COUNT) === i);

      dummy.position.set(keyX(col), pressed ? 0.026 : 0.036, keyZ(row));
      dummy.updateMatrix();
      capsRef.current.setMatrixAt(i, dummy.matrix);

      const wave = 0.5 + 0.5 * Math.sin(col * 0.55 + row * 0.35 - t * 2.2);
      const lit = boot * 1.25 > col / KEY_COLS ? 1 : 0.03; // varredura do boot
      color.copy(ACCENT).lerp(VIOLET, wave).multiplyScalar(lit * energy * (0.55 + 0.45 * wave));
      if (pressed) color.set("#ffffff");
      lightsRef.current.setColorAt(i, color);
    }

    capsRef.current.instanceMatrix.needsUpdate = true;
    lightsRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group {...props} rotation={[0.07, 0, 0]}>
      <RoundedBox args={[KEY_COLS * KEY_PITCH + 0.05, 0.035, KEY_ROWS * KEY_PITCH + 0.05]} radius={0.012} smoothness={4} material={mats.body} />
      {/* luz embaixo de cada tecla */}
      <instancedMesh ref={lightsRef} args={[null, null, KEY_COUNT]} material={lightMat} frustumCulled={false}>
        <boxGeometry args={[0.066, 0.008, 0.066]} />
      </instancedMesh>
      {/* keycaps */}
      <instancedMesh ref={capsRef} args={[null, null, KEY_COUNT]} material={capMat} frustumCulled={false}>
        <boxGeometry args={[0.054, 0.022, 0.054]} />
      </instancedMesh>
    </group>
  );
}
