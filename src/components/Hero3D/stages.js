// Estágios narrativos do hero (progress do scroll 0 → 1).
// Usado pela tela do monitor, pelo teclado e pelo HUD do Hero.
export const STAGES = [
  { id: "start", label: "hello", from: 0, to: 0.15 },
  { id: "wake", label: "boot", from: 0.15, to: 0.32 },
  { id: "orbit", label: "360°", from: 0.32, to: 0.5 },
  { id: "code", label: "code", from: 0.5, to: 0.68 },
  { id: "whoami", label: "whoami", from: 0.68, to: 0.85 },
  { id: "projects", label: "projects", from: 0.85, to: 1.0 },
];

export function getStage(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return STAGES.find((s) => p >= s.from && p <= s.to) || STAGES[STAGES.length - 1];
}
