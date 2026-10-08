import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * usePageAnimations
 * Animações de scroll declarativas: basta marcar o elemento no JSX.
 *
 *   data-split          título: palavras giram em 3D por trás de uma máscara, linha a linha
 *   data-scrub-text     texto que "acende" palavra por palavra conforme o scroll
 *   data-reveal         entra "deitado" e levanta em perspectiva
 *   data-reveal="flip"  igual, mas com um giro maior (cards e fotos)
 *   data-tilt           inclina em 3D seguindo o mouse (só com mouse)
 *   data-count          número que conta de 0 até o valor (ex.: "10+")
 *   data-parallax       imagem que desliza dentro da própria moldura
 *   data-marquee        faixa infinita que acelera com a velocidade do scroll
 *   data-draw           linha que cresce da esquerda para a direita
 *
 * O estado inicial é aplicado via JS: sem JS ou com prefers-reduced-motion,
 * todo o conteúdo já nasce visível.
 */
export function usePageAnimations() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx;
    let cancelled = false;
    const cleanups = [];

    const init = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        // ---------- Títulos ----------
        gsap.utils.toArray("[data-split]").forEach((el) => {
          SplitText.create(el, {
            type: "lines,words",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.words, {
                yPercent: 115,
                rotationX: -85,
                transformPerspective: 700,
                transformOrigin: "50% 100%",
                duration: 1.1,
                ease: "power4.out",
                stagger: 0.07,
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              }),
          });
        });

        // ---------- Texto que acende com o scroll ----------
        gsap.utils.toArray("[data-scrub-text]").forEach((el) => {
          const paragraphs = el.querySelectorAll("p:not(.eyebrow)");
          SplitText.create(paragraphs.length ? paragraphs : el, {
            type: "words",
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(
                self.words,
                { opacity: 0.16 },
                {
                  opacity: 1,
                  ease: "none",
                  stagger: 0.1,
                  scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 55%", scrub: 0.6 },
                }
              ),
          });
        });

        // ---------- Reveals ----------
        const fades = gsap.utils.toArray("[data-reveal]:not([data-reveal='flip'])");
        gsap.set(fades, { opacity: 0, y: 46, rotationX: 28, transformPerspective: 900, transformOrigin: "50% 100%" });
        ScrollTrigger.batch(fades, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              rotationX: 0,
              duration: 1,
              ease: "power3.out",
              stagger: 0.1,
              overwrite: true,
            }),
        });

        const flips = gsap.utils.toArray("[data-reveal='flip']");
        gsap.set(flips, { opacity: 0, y: 90, z: -160, rotationX: 55, transformPerspective: 1000, transformOrigin: "50% 100%" });
        ScrollTrigger.batch(flips, {
          start: "top 94%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              z: 0,
              rotationX: 0,
              duration: 1.2,
              ease: "power4.out",
              stagger: 0.12,
              overwrite: "auto",
            }),
        });

        // ---------- Tilt 3D com o mouse ----------
        if (window.matchMedia("(pointer: fine)").matches) {
          gsap.utils.toArray("[data-tilt]").forEach((el) => {
            const strength = Number(el.dataset.tilt) || 10;
            gsap.set(el, { transformPerspective: 900 });
            const rotateX = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
            const rotateY = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });

            const handleMove = (e) => {
              const rect = el.getBoundingClientRect();
              const px = (e.clientX - rect.left) / rect.width - 0.5;
              const py = (e.clientY - rect.top) / rect.height - 0.5;
              rotateY(px * strength);
              rotateX(py * -strength);
              // posição do brilho (ver [data-tilt]::after no index.css)
              el.style.setProperty("--tilt-x", `${(px + 0.5) * 100}%`);
              el.style.setProperty("--tilt-y", `${(py + 0.5) * 100}%`);
            };
            const handleLeave = () => {
              rotateX(0);
              rotateY(0);
            };

            el.addEventListener("pointermove", handleMove);
            el.addEventListener("pointerleave", handleLeave);
            cleanups.push(() => {
              el.removeEventListener("pointermove", handleMove);
              el.removeEventListener("pointerleave", handleLeave);
            });
          });
        }

        // ---------- Contadores ----------
        gsap.utils.toArray("[data-count]").forEach((el) => {
          const match = el.textContent.trim().match(/^(\d+)(.*)$/);
          if (!match) return;
          const target = Number(match[1]);
          const suffix = match[2];
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => (el.textContent = Math.round(counter.value) + suffix),
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // ---------- Parallax de imagem ----------
        gsap.utils.toArray("[data-parallax]").forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -9, scale: 1.2 },
            {
              yPercent: 9,
              scale: 1.2,
              ease: "none",
              scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        });

        // ---------- Marquee reativo ao scroll ----------
        gsap.utils.toArray("[data-marquee]").forEach((track) => {
          track.classList.add("is-gsap"); // desliga a animação CSS de fallback
          const loop = gsap.to(track, { xPercent: -50, duration: 24, ease: "none", repeat: -1 });
          const skewTo = gsap.quickTo(track, "skewX", { duration: 0.4, ease: "power3.out" });
          let settle;

          ScrollTrigger.create({
            trigger: track,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              const velocity = self.getVelocity();
              const boost = gsap.utils.clamp(0, 7, Math.abs(velocity) / 220);
              gsap.to(loop, { timeScale: 1 + boost, duration: 0.2, overwrite: true });
              gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.2 });
              skewTo(gsap.utils.clamp(-12, 12, velocity / -160));
              settle?.kill();
              settle = gsap.delayedCall(0.25, () => skewTo(0));
            },
          });
        });

        // ---------- Linhas que se desenham ----------
        gsap.utils.toArray("[data-draw]").forEach((line) => {
          gsap.from(line, {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 1.2,
            ease: "power3.inOut",
            scrollTrigger: { trigger: line, start: "top 92%", once: true },
          });
        });
      });

      ScrollTrigger.refresh();
    };

    // SplitText mede as linhas: precisa das fontes já carregadas
    if (document.fonts?.ready) document.fonts.ready.then(init);
    else init();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      ctx?.revert();
    };
  }, []);
}
