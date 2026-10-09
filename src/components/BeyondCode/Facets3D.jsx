import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * Facets3D
 * Cena da seção "É mais que apenas um código": um núcleo de energia no centro
 * e um objeto 3D por faceta girando em órbita. O scroll (progressRef 0 → 1)
 * gira a órbita; quem chega na frente cresce, sobe e acende.
 *
 * O canvas é transparente: o mundo 3D do fundo (World3D) continua aparecendo atrás.
 */

const ACCENT = "#4DB8F2";
const HOT = "#9BE1FF";
const VIOLET = "#8B7CFF";

const RADIUS = 2.4; // raio da órbita

const Mats = createContext(null);

export default function Facets3D({ progressRef, facets, isMobile = false }) {
  // só renderiza com a seção na tela
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "20% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mouseRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (isMobile) return;
    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isMobile]);

  const dpr = useMemo(
    () => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)),
    [isMobile]
  );

  return (
    <div className="beyond__canvas" ref={wrapRef} aria-hidden="true">
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.5, 9.6], fov: 38, near: 0.1, far: 60 }}
      >
        <fog attach="fog" args={["#050D16", 8.5, 17]} />
        <ambientLight intensity={0.55} color="#BAE6FD" />
        <directionalLight position={[1, 3, 6]} intensity={1.1} color="#EAF7FF" />
        <pointLight position={[4, 2.5, 5]} intensity={70} color={ACCENT} distance={16} decay={1.7} />
        <pointLight position={[-4, 0.5, 4]} intensity={60} color={VIOLET} distance={16} decay={1.7} />

        <Scene progressRef={progressRef} mouseRef={mouseRef} facets={facets} />
      </Canvas>
    </div>
  );
}

function Scene({ progressRef, mouseRef, facets }) {
  const rig = useRef();
  const ring = useRef();
  const angle = useRef(0);
  const size = useThree((s) => s.size);
  const portrait = size.width / size.height < 1;

  const step = (Math.PI * 2) / facets.length;

  // Materiais compartilhados: sólido escuro facetado + neons sem tone mapping
  const mats = useMemo(
    () => ({
      solid: new THREE.MeshStandardMaterial({ color: "#0F2233", roughness: 0.3, metalness: 0.75, flatShading: true }),
      metal: new THREE.MeshStandardMaterial({ color: "#1B3447", roughness: 0.22, metalness: 0.9 }),
      accent: new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false }),
      hot: new THREE.MeshBasicMaterial({ color: HOT, toneMapped: false }),
      violet: new THREE.MeshBasicMaterial({ color: VIOLET, toneMapped: false }),
    }),
    []
  );

  const glowMap = useGlowTexture();

  useFrame(({ camera }, delta) => {
    const progress = progressRef?.current ?? 0;
    const mouse = mouseRef.current;

    // a órbita gira até a faceta atual ficar de frente para a câmera
    angle.current = THREE.MathUtils.damp(angle.current, -progress * (facets.length - 1) * step, 5, delta);
    ring.current.rotation.y = angle.current;

    // parallax do mouse
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, mouse.x * 0.12, 4, delta);
    rig.current.rotation.x = THREE.MathUtils.damp(rig.current.rotation.x, 0.2 + mouse.y * 0.06, 4, delta);

    // em retrato a câmera recua para a faceta da frente caber na largura
    camera.position.z = THREE.MathUtils.damp(camera.position.z, portrait ? 11.5 : 9.6, 4, delta);
  });

  return (
    <Mats.Provider value={mats}>
      <group ref={rig} position={portrait ? [0, -1.25, 0] : [2.05, -0.35, 0]} scale={portrait ? 0.82 : 1} rotation={[0.2, 0, 0]}>
        <Core glowMap={glowMap} />
        <Pedestal count={facets.length} />

        <group ref={ring}>
          {facets.map((facet, i) => (
            <Slot key={facet.id} index={i} step={step} angle={angle}>
              <FacetObject id={facet.id} />
            </Slot>
          ))}
        </group>

        {/* halo fixo no lugar de destaque (quem está na frente fica dentro dele) */}
        <sprite position={[0, 0.4, RADIUS - 0.4]} scale={4.2}>
          <spriteMaterial map={glowMap} color={ACCENT} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>

        <Sparkles count={60} scale={[8, 4, 8]} size={2.4} speed={0.3} color={HOT} opacity={0.7} />
      </group>
    </Mats.Provider>
  );
}

/* Textura de halo radial (substitui o Bloom: funciona com canvas transparente) */
function useGlowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
}

/* Cada posição da órbita. `front` (0 → 1) mede o quanto ela está virada para a câmera. */
function Slot({ index, step, angle, children }) {
  const pivot = useRef();
  const spin = useRef(index * 1.3);
  const slotAngle = index * step;

  useFrame(({ clock }, delta) => {
    const front = Math.pow(Math.max(0, Math.cos(slotAngle + angle.current)), 3);
    const group = pivot.current;

    spin.current += delta * (0.25 + front * 0.55);
    // desfaz o giro da órbita para o objeto não ficar de costas, e soma o giro próprio
    group.rotation.y = -angle.current + Math.sin(spin.current) * 0.55;
    group.rotation.x = Math.sin(spin.current * 0.7) * 0.12;

    const scale = THREE.MathUtils.damp(group.scale.x, 0.6 + front * 0.62, 6, delta);
    group.scale.setScalar(scale);
    group.position.y = front * 0.45 + Math.sin(clock.elapsedTime * 0.9 + index) * 0.08;
  });

  return (
    <group position={[Math.sin(slotAngle) * RADIUS, 0, Math.cos(slotAngle) * RADIUS]}>
      <group ref={pivot}>{children}</group>
    </group>
  );
}

/* Núcleo: esfera pulsando dentro de uma gaiola, com dois anéis em órbita */
function Core({ glowMap }) {
  const cage = useRef();
  const heart = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const mats = useContext(Mats);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    cage.current.rotation.y += delta * 0.25;
    cage.current.rotation.x += delta * 0.12;
    heart.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.1);
    ringA.current.rotation.x = t * 0.6;
    ringA.current.rotation.y = t * 0.35;
    ringB.current.rotation.y = -t * 0.5;
    ringB.current.rotation.z = t * 0.3;
  });

  return (
    <group position={[0, 0.25, 0]}>
      <mesh ref={heart} material={mats.violet}>
        <icosahedronGeometry args={[0.36, 2]} />
      </mesh>
      <mesh ref={cage}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh ref={ringA} material={mats.hot}>
        <torusGeometry args={[1.12, 0.012, 6, 80]} />
      </mesh>
      <mesh ref={ringB} material={mats.violet}>
        <torusGeometry args={[1.34, 0.012, 6, 80]} />
      </mesh>
      <sprite scale={3.6}>
        <spriteMaterial map={glowMap} color={VIOLET} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/* Trilho da órbita no chão, com uma marca por faceta */
function Pedestal({ count }) {
  const mats = useContext(Mats);
  return (
    <group position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[RADIUS, 0.012, 6, 120]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[RADIUS * 0.45, 0.008, 6, 80]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[RADIUS * 1.32, 0.006, 6, 120]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * RADIUS, -Math.cos(a) * RADIUS, 0]} material={mats.hot}>
            <circleGeometry args={[0.05, 16]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- Os objetos de cada faceta (todos em primitivas, ~1 unidade) ---------- */

function FacetObject({ id }) {
  const Component = OBJECTS[id];
  return Component ? <Component /> : null;
}

function Neon({ color = ACCENT }) {
  return <Edges color={color} threshold={15} />;
}

// CÓDIGO — uma janela com "</>" em neon
function CodeObject() {
  const mats = useContext(Mats);
  const bar = [0.46, 0.09, 0.12];
  return (
    <group>
      <RoundedBox args={[2, 1.3, 0.1]} radius={0.06} smoothness={3} position={[0, 0, -0.14]} material={mats.solid}>
        <Neon />
      </RoundedBox>
      {/* barra de título */}
      <mesh position={[0, 0.52, -0.08]} material={mats.accent}>
        <boxGeometry args={[1.86, 0.012, 0.02]} />
      </mesh>
      {[-0.82, -0.72, -0.62].map((x, i) => (
        <mesh key={x} position={[x, 0.585, -0.08]} material={i ? mats.violet : mats.hot}>
          <sphereGeometry args={[0.028, 12, 12]} />
        </mesh>
      ))}
      {/* < */}
      <mesh position={[-0.58, 0.02, 0]} rotation={[0, 0, 0.62]} material={mats.hot}>
        <boxGeometry args={bar} />
      </mesh>
      <mesh position={[-0.58, -0.24, 0]} rotation={[0, 0, -0.62]} material={mats.hot}>
        <boxGeometry args={bar} />
      </mesh>
      {/* / */}
      <mesh position={[0, -0.11, 0]} rotation={[0, 0, -0.32]} material={mats.violet}>
        <boxGeometry args={[0.09, 0.78, 0.12]} />
      </mesh>
      {/* > */}
      <mesh position={[0.58, 0.02, 0]} rotation={[0, 0, -0.62]} material={mats.hot}>
        <boxGeometry args={bar} />
      </mesh>
      <mesh position={[0.58, -0.24, 0]} rotation={[0, 0, 0.62]} material={mats.hot}>
        <boxGeometry args={bar} />
      </mesh>
    </group>
  );
}

// CONTEÚDO — um celular gravando, com play e ondas de alcance
function ContentObject() {
  const mats = useContext(Mats);
  return (
    <group>
      <RoundedBox args={[0.95, 1.7, 0.12]} radius={0.1} smoothness={4} material={mats.solid}>
        <Neon />
      </RoundedBox>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[0.8, 1.5]} />
        <meshBasicMaterial color="#0A2A3D" toneMapped={false} />
      </mesh>
      {/* play */}
      <mesh position={[0.03, 0, 0.1]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} material={mats.hot}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 3]} />
      </mesh>
      {/* REC */}
      <mesh position={[-0.27, 0.6, 0.09]} material={mats.violet}>
        <sphereGeometry args={[0.045, 16, 16]} />
      </mesh>
      {/* barra de progresso do vídeo */}
      <mesh position={[0, -0.6, 0.09]} material={mats.accent}>
        <boxGeometry args={[0.6, 0.025, 0.01]} />
      </mesh>
      {/* ondas */}
      {[0.75, 0.98, 1.21].map((r, i) => (
        <mesh key={r} rotation={[0, 0, -Math.PI / 4]} material={i === 1 ? mats.violet : mats.accent}>
          <torusGeometry args={[r, 0.014, 6, 32, Math.PI / 2]} />
        </mesh>
      ))}
    </group>
  );
}

// COMUNIDADE — pessoas (nós) conectadas em rede
const NODES = [
  [0, 0, 0, 0.24],
  [0.85, 0.35, 0.2, 0.15],
  [-0.8, 0.5, -0.15, 0.16],
  [0.45, -0.7, -0.3, 0.14],
  [-0.6, -0.55, 0.35, 0.15],
  [0.1, 0.85, -0.35, 0.13],
  [-0.15, -0.2, 0.8, 0.12],
];
const LINKS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 5], [2, 5], [3, 4], [4, 6], [1, 3],
];

function CommunityObject() {
  const mats = useContext(Mats);
  const links = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    return LINKS.map(([a, b]) => {
      const from = new THREE.Vector3(...NODES[a]);
      const to = new THREE.Vector3(...NODES[b]);
      const dir = to.clone().sub(from);
      return {
        position: from.clone().add(to).multiplyScalar(0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()),
        length: dir.length(),
      };
    });
  }, []);

  return (
    <group scale={1.05}>
      {NODES.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={i === 0 ? mats.hot : i % 2 ? mats.accent : mats.violet}>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
      {links.map((link, i) => (
        <mesh key={i} position={link.position} quaternion={link.quaternion}>
          <cylinderGeometry args={[0.012, 0.012, link.length, 6]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// TECNOLOGIA — um chip com o núcleo aceso e os pinos
function TechObject() {
  const mats = useContext(Mats);
  const pins = [-0.4, -0.2, 0, 0.2, 0.4];
  return (
    <group rotation={[1.05, 0, 0.35]}>
      <RoundedBox args={[1.25, 0.16, 1.25]} radius={0.04} smoothness={3} material={mats.solid}>
        <Neon />
      </RoundedBox>
      <mesh position={[0, 0.09, 0]} material={mats.hot}>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[0.72, 0.012, 0.72]} />
        <meshBasicMaterial color={VIOLET} wireframe toneMapped={false} />
      </mesh>
      {/* trilhas do núcleo até a borda */}
      {pins.map((p) => (
        <group key={p}>
          <mesh position={[p, 0.085, 0]} material={mats.accent}>
            <boxGeometry args={[0.012, 0.006, 1.2]} />
          </mesh>
          <mesh position={[0, 0.085, p]} material={mats.accent}>
            <boxGeometry args={[1.2, 0.006, 0.012]} />
          </mesh>
        </group>
      ))}
      {/* pinos */}
      {pins.map((p) =>
        [-1, 1].map((side) => (
          <group key={`${p}-${side}`}>
            <mesh position={[p, -0.02, side * 0.72]} material={mats.metal}>
              <boxGeometry args={[0.07, 0.05, 0.22]} />
            </mesh>
            <mesh position={[side * 0.72, -0.02, p]} material={mats.metal}>
              <boxGeometry args={[0.22, 0.05, 0.07]} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

// CRIATIVIDADE — um nó contínuo, sem começo nem fim
function CreativityObject() {
  const mats = useContext(Mats);
  return (
    <group scale={1.05}>
      <mesh material={mats.solid}>
        <torusKnotGeometry args={[0.55, 0.17, 110, 10, 2, 3]} />
      </mesh>
      <mesh scale={1.015}>
        <torusKnotGeometry args={[0.55, 0.17, 60, 6, 2, 3]} />
        <meshBasicMaterial color={VIOLET} wireframe transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  );
}

// FITNESS — um halter com anéis de neon nas anilhas
function FitnessObject() {
  const mats = useContext(Mats);
  return (
    <group rotation={[0.3, 0, 0.42]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
        <cylinderGeometry args={[0.055, 0.055, 1.9, 16]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={mats.solid}>
            <cylinderGeometry args={[0.44, 0.44, 0.14, 8]} />
            <Neon />
          </mesh>
          <mesh position={[0, -side * 0.15, 0]} material={mats.solid}>
            <cylinderGeometry args={[0.32, 0.32, 0.12, 8]} />
            <Neon color={VIOLET} />
          </mesh>
          <mesh position={[0, side * 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.hot}>
            <torusGeometry args={[0.3, 0.012, 6, 40]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const OBJECTS = {
  code: CodeObject,
  content: ContentObject,
  community: CommunityObject,
  tech: TechObject,
  creativity: CreativityObject,
  fitness: FitnessObject,
};
