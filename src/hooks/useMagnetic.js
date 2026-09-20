import { useEffect, useRef } from "react";

/**
 * useMagnetic
 * Aplica um efeito magnético sutil a um elemento: ele se desloca em direção
 * ao cursor enquanto o mouse estiver por perto, e volta suavemente ao soltar.
 *
 * strength: 0 → 1, quanto o elemento "segue" o mouse
 */
export function useMagnetic(strength = 0.35) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // sem efeito no touch
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    }

    function handleLeave() {
      el.style.transform = "translate(0, 0)";
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [strength]);

  return ref;
}
