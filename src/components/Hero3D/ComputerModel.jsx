import { useGLTF, RoundedBox } from "@react-three/drei";

/**
 * ComputerModel
 * Se `modelUrl` for passado (ex: "/models/computer.glb"), carrega o modelo
 * externo via GLTF. Caso contrário, renderiza um setup construído em
 * primitivas (monitor + stand + base + teclado + mouse + torre) — já com a
 * estética certa para não depender de um arquivo externo.
 *
 * Para trocar pelo modelo real:
 * 1. Coloque o arquivo em `public/models/computer.glb`
 * 2. Renderize <ComputerModel modelUrl="/models/computer.glb" />
 */
export default function ComputerModel({ modelUrl, isMobile }) {
  if (modelUrl) {
    return <GLTFComputer url={modelUrl} />;
  }
  return <PrimitiveComputer isMobile={isMobile} />;
}

function GLTFComputer({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

// Pré-carrega quando um modelUrl for definido em produção (no-op se nunca usado)
useGLTF.preload?.("/models/computer.glb");

function PrimitiveComputer({ isMobile }) {
  const segments = isMobile ? 16 : 32;
  const radius = 0.035;

  // Corpo em plástico/metal escovado — clearcoat dá aquele verniz premium
  const bodyMat = {
    color: "#0F1E2B",
    roughness: 0.32,
    metalness: 0.6,
    clearcoat: isMobile ? 0 : 0.6,
    clearcoatRoughness: 0.25,
  };
  const materialType = isMobile ? "meshStandardMaterial" : "meshPhysicalMaterial";

  // Acentos (frestas do teclado, painel da torre) com leve emissão própria
  const accentMat = {
    color: "#4DB8F2",
    roughness: 0.2,
    metalness: 0.3,
    emissive: "#2C86B8",
    emissiveIntensity: 0.6,
  };

  // Vidro/tela — emissiva moderada para o Bloom reagir sem lavar o conteúdo
  const screenGlowMat = {
    color: "#0A2A3D",
    emissive: "#1E6E96",
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0,
  };

  const Body = (props) => {
    const MatTag = materialType;
    return (
      <RoundedBox radius={radius} smoothness={4} castShadow receiveShadow {...props}>
        <MatTag {...bodyMat} />
      </RoundedBox>
    );
  };

  return (
    <group>
      {/* Monitor */}
      <group position={[0, 0.55, 0]}>
        {/* Bezel / moldura com cantos arredondados */}
        <Body args={[1.9, 1.15, 0.08]} />

        {/* Brilho sutil por trás da tela (visível só nas bordas) — alimenta o bloom */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.8, 1.06]} />
          <meshBasicMaterial color="#3FB6F0" transparent opacity={0.12} />
        </mesh>

        {/* Tela (conteúdo real fica no componente Screen, sobreposto aqui) */}
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.72, 0.98]} />
          <meshStandardMaterial {...screenGlowMat} />
        </mesh>

        {/* Pé do monitor */}
        <mesh position={[0, -0.72, -0.02]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.35, segments]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>
        <RoundedBox
          args={[0.64, 0.04, 0.64]}
          radius={0.02}
          smoothness={4}
          position={[0, -0.92, -0.02]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...bodyMat} />
        </RoundedBox>
      </group>

      {/* Teclado */}
      <RoundedBox
        args={[1.1, 0.05, 0.4]}
        radius={0.02}
        smoothness={4}
        position={[0, -0.98, 0.65]}
        rotation={[-0.12, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...bodyMat} />
      </RoundedBox>
      {Array.from({ length: 3 }).map((_, row) => (
        <mesh key={row} position={[0, -0.945, 0.5 + row * 0.13]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.98, 0.015, 0.08]} />
          <meshStandardMaterial {...accentMat} />
        </mesh>
      ))}

      {/* Mouse */}
      <group position={[0.75, -0.97, 0.75]} rotation={[-0.1, 0.3, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.09, segments, segments]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>
      </group>

      {/* Torre / gabinete ao lado */}
      <RoundedBox
        args={[0.35, 0.75, 0.75]}
        radius={0.03}
        smoothness={4}
        position={[-1.15, -0.75, 0.1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...bodyMat} />
      </RoundedBox>
      <mesh position={[-1.15, -0.75, 0.48]}>
        <planeGeometry args={[0.28, 0.5]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>

      {/* Base / mesa sutil */}
      <mesh position={[0, -1.15, 0.2]} receiveShadow>
        <boxGeometry args={[3.4, 0.06, 1.8]} />
        <meshStandardMaterial color="#EAF7FF" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}
