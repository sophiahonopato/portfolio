import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Journey3D
 * A jornada como um voo: um trilho de neon que sobe pelo espaço e um portal
 * por marco. O card de cada capítulo (HTML de verdade, posicionado em 3D)
 * fica dentro do portal. O scroll (progressRef 0 → 1) leva a câmera de um
 * portal ao outro — ela para na frente do card, atravessa e segue.
 *
 * O canvas é transparente: o mundo 3D do fundo (World3D) continua atrás.
 */

const ACCENT = "#4DB8F2";
const HOT = "#9BE1FF";
const VIOLET = "#8B7CFF";

const SPACING = 10; // distância entre portais
const RING = 2.05; // raio do portal
const RAIL_DROP = 1.25; // o trilho passa abaixo do centro dos portais

// 400px de card → largura no mundo (no <Html transform>, 400px = 10 unidades com scale 1)
const CARD_SCALE = 0.29;

/* Caminho: cada marco fica mais alto que o anterior (a jornada sobe) e
   alterna de lado, o que faz o voo serpentear. */
function buildPath(count) {
  const gates = Array.from(
    { length: count },
    (_, i) => new THREE.Vector3(Math.sin(i * 1.15) * 2.4, i * 1.15, -i * SPACING)
  );
  const start = new THREE.Vector3(0, -0.9, SPACING * 1.3);
  const end = gates[count - 1].clone().add(new THREE.Vector3(0, 0.8, -SPACING));
  const curve = new THREE.CatmullRomCurve3([start, ...gates, end], false, "catmullrom", 0.5);
  const total = curve.getLength();

  // posição de cada portal ao longo da curva (0 → 1), por amostragem
  const SAMPLES = 800;
  const points = Array.from({ length: SAMPLES + 1 }, (_, k) => curve.getPointAt(k / SAMPLES));
  const us = gates.map((gate) => {
    let best = 0;
    let bestDistance = Infinity;
    points.forEach((point, k) => {
      const distance = point.distanceToSquared(gate);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k;
      }
    });
    return best / SAMPLES;
  });

  // orientação: +Z de cada portal aponta para quem está chegando
  const helper = new THREE.Object3D();
  const quaternions = gates.map((gate, i) => {
    const tangent = curve.getTangentAt(us[i]);
    helper.position.copy(gate);
    helper.lookAt(gate.clone().sub(tangent));
    return helper.quaternion.clone();
  });

  return { curve, total, gates, us, quaternions };
}

export default function Journey3D({ progressRef, milestones, isMobile = false }) {
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
    () => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)),
    [isMobile]
  );

  return (
    <div className="journey__canvas" ref={wrapRef}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 12], fov: 42, near: 0.1, far: 90 }}
      >
        <fog attach="fog" args={["#050D16", 9, 34]} />
        <Scene progressRef={progressRef} mouseRef={mouseRef} milestones={milestones} />
      </Canvas>
    </div>
  );
}

function Scene({ progressRef, mouseRef, milestones }) {
  const path = useMemo(() => buildPath(milestones.length), [milestones.length]);
  const size = useThree((s) => s.size);
  const portrait = size.width / size.height < 1;

  // distância em que a câmera para na frente de cada card (em retrato precisa
  // recuar mais para o card caber na largura)
  const stopDistance = portrait ? 8.6 : 6.6;

  // estado do voo compartilhado com portais/cards a cada frame
  const flight = useRef({ arc: 0, progress: 0 });
  const look = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3());
  const first = useRef(true);

  useFrame(({ camera, clock }, delta) => {
    const target = progressRef?.current ?? 0;
    const state = flight.current;
    state.progress = first.current ? target : THREE.MathUtils.damp(state.progress, target, 4, delta);
    first.current = false;

    // arco percorrido: no progresso i/(n-1) a câmera está `stopDistance` antes do portal i
    const firstArc = path.us[0] * path.total;
    const lastArc = path.us[path.us.length - 1] * path.total;
    state.arc = THREE.MathUtils.lerp(firstArc, lastArc, state.progress) - stopDistance;

    const u = THREE.MathUtils.clamp(state.arc / path.total, 0, 1);
    const uLook = THREE.MathUtils.clamp((state.arc + stopDistance) / path.total, 0, 1);
    path.curve.getPointAt(u, position.current);
    path.curve.getPointAt(uLook, look.current);

    const mouse = mouseRef.current;
    const t = clock.elapsedTime;
    camera.position.set(
      position.current.x + mouse.x * 0.5 + Math.sin(t * 0.5) * 0.06,
      position.current.y - mouse.y * 0.3 + Math.cos(t * 0.6) * 0.06,
      position.current.z
    );
    camera.lookAt(look.current);
    camera.rotateZ(mouse.x * -0.03);

    const fov = portrait ? 52 : 42;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <Rail path={path} />
      <Packets path={path} />
      {milestones.map((milestone, i) => (
        <Gate
          key={milestone.title}
          index={i}
          total={milestones.length}
          milestone={milestone}
          path={path}
          flight={flight}
          stopDistance={stopDistance}
        />
      ))}
      <Scaffold path={path} />
    </>
  );
}

/* Trilho: um tubo de neon acompanhando o caminho, um pouco abaixo da câmera */
function Rail({ path }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(path.curve, 500, 0.022, 6, false), [path]);
  const glow = useMemo(() => new THREE.TubeGeometry(path.curve, 300, 0.09, 6, false), [path]);
  return (
    <group position={[0, -RAIL_DROP, 0]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial color={ACCENT} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* Pacotes de luz correndo pelo trilho, sempre para a frente */
function Packets({ path, count = 26 }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.035;
    for (let i = 0; i < count; i++) {
      const u = (t + i / count) % 1;
      path.curve.getPointAt(u, point);
      dummy.position.set(point.x, point.y - RAIL_DROP, point.z);
      dummy.scale.setScalar(i % 4 === 0 ? 1.6 : 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

/* Portal de um marco: anéis girando, feixe até o chão e o card dentro */
function Gate({ index, total, milestone, path, flight, stopDistance }) {
  const outer = useRef();
  const arcs = useRef();
  const ringMaterial = useRef();
  const membrane = useRef();
  const card = useRef();
  const color = index % 2 ? VIOLET : ACCENT;
  const gateArc = path.us[index] * path.total;

  useFrame(({ clock }, delta) => {
    outer.current.rotation.z += delta * 0.18 * (index % 2 ? -1 : 1);
    arcs.current.rotation.z -= delta * 0.45 * (index % 2 ? -1 : 1);

    // distância (ao longo do trilho) entre a câmera e este portal
    const ahead = gateArc - flight.current.arc;

    // o card aparece ao se aproximar e some quando a câmera atravessa o portal
    const fadeIn = 1 - THREE.MathUtils.smoothstep(ahead, stopDistance + 2.5, stopDistance + 8);
    const fadeOut = THREE.MathUtils.smoothstep(ahead, 1, 3);
    const visibility = fadeIn * fadeOut;

    if (card.current) {
      card.current.style.opacity = visibility.toFixed(3);
      card.current.style.visibility = visibility < 0.01 ? "hidden" : "visible";
    }

    // o portal acende quando é o capítulo atual
    const near = 1 - THREE.MathUtils.smoothstep(Math.abs(ahead - stopDistance), 0, 9);
    ringMaterial.current.opacity = 0.35 + near * 0.65;
    membrane.current.opacity = 0.1 + near * 0.32 * fadeOut;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2 + index) * 0.012 * near;
    outer.current.scale.setScalar(pulse);
  });

  return (
    <group position={path.gates[index]} quaternion={path.quaternions[index]}>
      {/* anel principal */}
      <mesh>
        <torusGeometry args={[RING, 0.022, 8, 120]} />
        <meshBasicMaterial ref={ringMaterial} color={color} transparent toneMapped={false} />
      </mesh>
      {/* moldura hexagonal */}
      <mesh ref={outer}>
        <torusGeometry args={[RING + 0.42, 0.012, 4, 6]} />
        <meshBasicMaterial color={HOT} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* três arcos girando */}
      <group ref={arcs}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI * 2) / 3]}>
            <torusGeometry args={[RING + 0.2, 0.035, 6, 24, Math.PI / 3.2]} />
            <meshBasicMaterial color={index % 2 ? ACCENT : VIOLET} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* "membrana" do portal, atrás do card */}
      <mesh position={[0, 0, -0.06]}>
        <circleGeometry args={[RING, 64]} />
        <meshBasicMaterial ref={membrane} color="#0B2438" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* feixe até o chão: dá a noção de altura */}
      <mesh position={[0, -RING - 9, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 18, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
      </mesh>

      <Html transform scale={CARD_SCALE} position={[0, 0.05, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <article className="journey-card" ref={card}>
          <span className="journey-card__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="journey-card__chapter">
            capítulo {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="journey-card__year">{milestone.year}</span>
          <h3 className="journey-card__title">{milestone.title}</h3>
          <p className="journey-card__text">{milestone.text}</p>
        </article>
      </Html>
    </group>
  );
}

/* No último portal ("always building"): blocos em construção orbitando */
function Scaffold({ path }) {
  const ref = useRef();
  const last = path.gates.length - 1;
  const blocks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = RING + 1.1 + (i % 3) * 0.45;
        return {
          position: [Math.cos(angle) * radius, Math.sin(angle) * radius, ((i % 4) - 1.5) * 0.5],
          size: 0.22 + (i % 3) * 0.1,
          color: i % 2 ? VIOLET : ACCENT,
        };
      }),
    []
  );

  useLayoutEffect(() => {
    ref.current.quaternion.copy(path.quaternions[last]);
  }, [path, last]);

  useFrame((_, delta) => {
    ref.current.rotateZ(delta * 0.12);
  });

  return (
    <group ref={ref} position={path.gates[last]}>
      {blocks.map((block, i) => (
        <mesh key={i} position={block.position} rotation={[i, i * 0.7, 0]}>
          <boxGeometry args={[block.size, block.size, block.size]} />
          <meshBasicMaterial color="#0A1A28" transparent opacity={0.6} />
          <Edges color={block.color} />
        </mesh>
      ))}
    </group>
  );
}
