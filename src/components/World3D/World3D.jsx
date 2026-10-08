import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import "./style.css";

/**
 * World3D
 * O "mundo" atrás da página: um canvas fixo em tela cheia. A câmera avança
 * por ele conforme o scroll, passando por formas flutuantes, estrelas e o
 * mesmo piso em grid da cena do hero — as seções ficam transparentes por cima.
 */

// mesma cor de --bg (index.css) e do fundo da cena do hero
const NIGHT = "#050D16";
const ACCENT = "#4DB8F2";
const VIOLET = "#8B7CFF";

// profundidade total percorrida do topo ao fim da página
const DEPTH = 130;

// gerador pseudoaleatório com semente: a cena é sempre a mesma a cada visita
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES = ["ico", "octa", "torus", "box", "ring", "tetra"];

export default function World3D({ isMobile = false }) {
  // Enquanto o hero cobre a tela inteira o mundo não aparece: não renderiza
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) {
      setCovered(false);
      return;
    }

    let frame = 0;
    const check = () => {
      frame = 0;
      setCovered(hero.getBoundingClientRect().bottom >= window.innerHeight - 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // avisa o CSS que o mundo 3D está ativo (desliga o grid chapado de fallback)
  useEffect(() => {
    document.documentElement.classList.add("has-world");
    return () => document.documentElement.classList.remove("has-world");
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
    () => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5)),
    [isMobile]
  );

  return (
    <div className="world3d" aria-hidden="true">
      <Canvas
        frameloop={covered ? "never" : "always"}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.6, 0], fov: 55, near: 0.1, far: 80 }}
      >
        <color attach="background" args={[NIGHT]} />
        <fog attach="fog" args={[NIGHT, 6, 38]} />

        <Flight mouseRef={mouseRef} />
        <Shapes count={isMobile ? 16 : 34} isMobile={isMobile} />
        <Stars count={isMobile ? 450 : 1100} />

        <Grid
          position={[0, -3.6, 0]}
          infiniteGrid
          followCamera
          cellSize={0.6}
          cellThickness={0.6}
          cellColor="#0D2436"
          sectionSize={3}
          sectionThickness={1}
          sectionColor="#1C5F87"
          fadeDistance={30}
          fadeStrength={2.4}
        />
      </Canvas>
    </div>
  );
}

/* Câmera: avança no eixo Z conforme o scroll, com parallax do mouse e as
   duas luzes coloridas presas a ela (iluminam as formas por onde passa). */
function Flight({ mouseRef }) {
  const blue = useRef();
  const violet = useRef();
  const smooth = useRef({ z: 0, x: 0, y: 0, roll: 0 });

  useFrame(({ camera, clock }, delta) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const mouse = mouseRef.current;
    const t = clock.elapsedTime;
    const damp = 1 - Math.pow(0.002, delta);
    const s = smooth.current;

    const targetZ = -progress * DEPTH;
    // a velocidade do voo inclina a câmera de leve (sensação de arrancada)
    const speed = targetZ - s.z;
    s.z += speed * damp;
    s.x += (mouse.x * 0.9 - s.x) * damp;
    s.y += (-mouse.y * 0.5 - s.y) * damp;
    s.roll += (THREE.MathUtils.clamp(speed * 0.02, -0.12, 0.12) + mouse.x * -0.03 - s.roll) * damp;

    camera.position.set(s.x + Math.sin(t * 0.3) * 0.15, 0.6 + s.y + Math.cos(t * 0.4) * 0.1, s.z);
    // olhando um pouco para cima: o horizonte do grid fica abaixo do meio da tela
    camera.rotation.set(0.1 + s.y * 0.05, -s.x * 0.06, s.roll);

    blue.current.position.set(camera.position.x - 5, 3, s.z - 6);
    violet.current.position.set(camera.position.x + 5, 1, s.z - 9);
  });

  return (
    <>
      <ambientLight intensity={0.35} color="#BAE6FD" />
      <pointLight ref={blue} color={ACCENT} intensity={90} distance={22} decay={1.7} />
      <pointLight ref={violet} color={VIOLET} intensity={70} distance={22} decay={1.7} />
    </>
  );
}

/* Formas geométricas espalhadas pelas laterais do caminho. Cada uma é um
   sólido facetado escuro com o próprio wireframe neon por cima. */
function Shapes({ count, isMobile }) {
  const items = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: count }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      // no celular a tela é estreita: as formas ficam mais perto do centro e mais ao fundo
      // bem afastadas do eixo: de longe aparecem pequenas perto do centro e só
      // crescem quando já estão saindo pelas bordas — não atravessam o texto
      const spread = isMobile ? 2.3 + rand() * 2.4 : 5 + rand() * 7;
      return {
        shape: SHAPES[Math.floor(rand() * SHAPES.length)],
        position: [side * spread, -1.2 + rand() * 5.2, -5 - (i / count) * (DEPTH + 16) - rand() * 3],
        scale: (isMobile ? 0.35 : 0.5) + rand() * (isMobile ? 0.6 : 1.3),
        color: rand() > 0.45 ? ACCENT : VIOLET,
        spin: [(rand() - 0.5) * 0.6, (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.4],
        phase: rand() * Math.PI * 2,
      };
    });
  }, [count, isMobile]);

  const solid = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0C1B29", roughness: 0.35, metalness: 0.7, flatShading: true }),
    []
  );

  return items.map((item, i) => <Shape key={i} item={item} solid={solid} wireOpacity={isMobile ? 0.38 : 0.55} />);
}

function Shape({ item, solid, wireOpacity }) {
  const ref = useRef();
  const baseY = item.position[1];

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    mesh.rotation.x += item.spin[0] * delta;
    mesh.rotation.y += item.spin[1] * delta;
    mesh.rotation.z += item.spin[2] * delta;
    mesh.position.y = baseY + Math.sin(clock.elapsedTime * 0.5 + item.phase) * 0.35;
  });

  const geometry = {
    ico: <icosahedronGeometry args={[1, 0]} />,
    octa: <octahedronGeometry args={[1, 0]} />,
    tetra: <tetrahedronGeometry args={[1.1, 0]} />,
    torus: <torusGeometry args={[0.9, 0.3, 8, 18]} />,
    ring: <torusGeometry args={[1.1, 0.04, 6, 48]} />,
    box: <boxGeometry args={[1.3, 1.3, 1.3]} />,
  }[item.shape];

  return (
    <group ref={ref} position={item.position} scale={item.scale}>
      {item.shape !== "ring" && <mesh material={solid}>{geometry}</mesh>}
      <mesh scale={1.012}>
        {geometry}
        <meshBasicMaterial color={item.color} wireframe={item.shape !== "ring"} transparent opacity={wireOpacity} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* Poeira de estrelas ao longo de todo o percurso */
function Stars({ count }) {
  const positions = useMemo(() => {
    const rand = mulberry32(21);
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      array[i * 3] = (rand() - 0.5) * 34;
      array[i * 3 + 1] = -2 + rand() * 12;
      array[i * 3 + 2] = 6 - rand() * (DEPTH + 40);
    }
    return array;
  }, [count]);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9BE1FF" size={0.05} sizeAttenuation transparent opacity={0.7} depthWrite={false} toneMapped={false} />
    </points>
  );
}
