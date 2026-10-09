import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollToTarget } from "../../lib/scroll";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const Facets3D = lazy(() => import("./Facets3D"));

// Cada faceta tem um objeto 3D próprio em Facets3D.jsx (ligado pelo `id`)
const FACETS = [
  { id: "code", category: "CÓDIGO", title: "Criando ideias através da tecnologia" },
  { id: "content", category: "CONTEÚDO", title: "Compartilhando minha jornada" },
  { id: "community", category: "COMUNIDADE", title: "Conectando pessoas e tecnologia" },
  { id: "tech", category: "TECNOLOGIA", title: "Uma paixão que começou desde pequena." },
  { id: "creativity", category: "CRIATIVIDADE", title: "Onde tecnologia encontra criatividade" },
  { id: "fitness", category: "FITNESS", title: "Uma paixão que faz parte da minha vida" },
];

// quanto de scroll (em alturas de tela) cada faceta ocupa enquanto a seção está pinada
const SCROLL_PER_FACET = 0.75;

export default function BeyondCode() {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const facetRef = useRef(null);
  const barRef = useRef(null);
  const triggerRef = useRef(null);
  const progressRef = useRef(0);

  const [active, setActive] = useState(0);
  const [mode, setMode] = useState(null); // null até medir | "static" | "3d"
  const [isMobile, setIsMobile] = useState(false);
  // O canvas WebGL só é criado com a seção perto da tela e é destruído quando ela
  // fica longe: menos contextos e memória de GPU ao mesmo tempo (o Safari e GPUs
  // integradas derrubam contextos quando há muitos canvases grandes vivos).
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "100% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    setMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "static" : "3d");
  }, []);

  // Pin + scrub: o progresso do scroll gira a órbita e escolhe a faceta ativa
  useLayoutEffect(() => {
    if (mode !== "3d") return;

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=" + (FACETS.length - 1) * SCROLL_PER_FACET * 100 + "%",
        pin: stickyRef.current,
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          setActive(Math.round(self.progress * (FACETS.length - 1)));
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
        },
      });
    }, sectionRef);

    return () => {
      triggerRef.current = null;
      ctx.revert();
    };
  }, [mode]);

  // Troca de faceta: o texto novo levanta em 3D, linha por linha
  useLayoutEffect(() => {
    if (mode !== "3d" || !facetRef.current) return;
    const tween = gsap.fromTo(
      facetRef.current.children,
      { opacity: 0, y: 46, rotationX: -70, transformPerspective: 700, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, rotationX: 0, duration: 0.7, ease: "power3.out", stagger: 0.07 }
    );
    return () => tween.kill();
  }, [active, mode]);

  function goTo(index) {
    const trigger = triggerRef.current;
    if (!trigger) return;
    scrollToTarget(trigger.start + ((trigger.end - trigger.start) * index) / (FACETS.length - 1));
  }

  // Sem animação (prefers-reduced-motion): lista simples, sem pin nem WebGL
  if (mode === "static") {
    return (
      <section className="beyond beyond--static" id="beyond-code">
        <div className="container">
          <p className="eyebrow">comunidades tech</p>
          <h2 className="beyond__title">É MAIS QUE APENAS UM CÓDIGO.</h2>
          <ul className="beyond__list">
            {FACETS.map((facet) => (
              <li key={facet.id}>
                <span className="beyond__category neon-outline">{facet.category}</span>
                <span className="beyond__text">{facet.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const facet = FACETS[active];

  return (
    <section className="beyond" id="beyond-code" ref={sectionRef}>
      <div className="beyond__sticky" ref={stickyRef}>
        {mode === "3d" && near && (
          <Suspense fallback={null}>
            <Facets3D progressRef={progressRef} facets={FACETS} isMobile={isMobile} />
          </Suspense>
        )}

        <div className="beyond__content container">
          <header className="beyond__header">
            <p className="eyebrow">comunidades tech</p>
            <h2 className="beyond__title" data-split>
              É MAIS QUE APENAS
              <br />
              UM CÓDIGO.
            </h2>
          </header>

          {/* aria-live: leitores de tela anunciam a faceta quando ela troca */}
          <div className="beyond__facet" key={facet.id} ref={facetRef} aria-live="polite">
            <span className="beyond__index">
              {String(active + 1).padStart(2, "0")} / {String(FACETS.length).padStart(2, "0")}
            </span>
            <span className="beyond__category neon-outline">{facet.category}</span>
            <p className="beyond__text">{facet.title}</p>
          </div>

          <nav className="beyond__nav" aria-label="Facetas">
            <div className="beyond__bar" aria-hidden="true">
              <span ref={barRef} />
            </div>
            <ul>
              {FACETS.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={i === active ? "is-active" : ""}
                    onClick={() => goTo(i)}
                    aria-current={i === active ? "true" : undefined}
                    data-cursor="GO"
                  >
                    <i aria-hidden="true">{String(i + 1).padStart(2, "0")}</i>
                    <span>{item.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}
