// Ponto único de acesso ao Lenis para o resto do app (Nav, Footer...).
// Sem Lenis (prefers-reduced-motion), cai no scroll nativo.
let lenis = null;

export function setLenis(instance) {
  lenis = instance;
}

export function scrollToTarget(target) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo(0, target);
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ behavior: "auto" });
}

// Trava/destrava o scroll da página (menu fullscreen aberto)
export function lockScroll(locked) {
  document.body.style.overflow = locked ? "hidden" : "";
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}
