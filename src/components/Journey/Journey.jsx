import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollToTarget } from "../../lib/scroll";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const Journey3D = lazy(() => import("./Journey3D"));

const MILESTONES = [
  { year: "2025", title: "Primeira vez que eu faço um curso exclusivo de programação", text: "Comecei fazendo um curso de programação em novembro de 2025 para desenvolvimento web, aonde aprendi muitas habilidades e desde lá não parei mais kk." },
  { year: "2025", title: "Fazendo muitos cursos", text: "O final do ano eu estudei muito a parte teória e aprendi muitas coisas em cursos online gratuitos." },
  { year: "2026", title: "Minha virada de chave", text: "Em 2026 comecei a programar na prática e fazer muitos projetos fullstack e fechar contratos reais" },
  { year: "2026", title: "Comunidades e Eventos tech", text: "Comecei a me envolver com eventos e comunidades de tecnologia, virou parte da rotina criar conteúdo para as comunidades e ir para eventos tech antes da aula." },
  { year: "2026", title: "Criação de conteúdo", text: "Passei a compartilhar meu processo de aprendizado publicamente, e ajudar pessoas da comunidade a se desenvolverem" },
  { year: "2026", title: "Always building", text: "Seguindo em construção — novos projetos, novas experiências." },
];

// quanto de scroll (em alturas de tela) leva de um portal ao próximo
const SCROLL_PER_GATE = 0.9;

export default function Journey() {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
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

  // Pin + scrub: o progresso do scroll conduz a câmera pelo trilho
  useLayoutEffect(() => {
    if (mode !== "3d") return;

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=" + (MILESTONES.length - 1) * SCROLL_PER_GATE * 100 + "%",
        pin: stickyRef.current,
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          setActive(Math.round(self.progress * (MILESTONES.length - 1)));
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
        },
      });
    }, sectionRef);

    return () => {
      triggerRef.current = null;
      ctx.revert();
    };
  }, [mode]);

  function goTo(index) {
    const trigger = triggerRef.current;
    if (!trigger) return;
    scrollToTarget(trigger.start + ((trigger.end - trigger.start) * index) / (MILESTONES.length - 1));
  }

  // Sem animação (prefers-reduced-motion): os mesmos cards em lista, sem pin nem WebGL
  if (mode === "static") {
    return (
      <section className="journey journey--static" id="journey">
        <div className="container">
          <p className="eyebrow">um pouco sobre a minha história</p>
          <h2 className="journey__title">MINHA JORNADA</h2>
          <div className="journey__list">
            {MILESTONES.map((m, i) => (
              <article className="journey-card" key={m.title}>
                <span className="journey-card__index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="journey-card__year">{m.year}</span>
                <h3 className="journey-card__title">{m.title}</h3>
                <p className="journey-card__text">{m.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="journey" id="journey" ref={sectionRef}>
      <div className="journey__sticky" ref={stickyRef}>
        {mode === "3d" && near && (
          <Suspense fallback={null}>
            <Journey3D progressRef={progressRef} milestones={MILESTONES} isMobile={isMobile} />
          </Suspense>
        )}

        <div className="journey__content container">
          <header className="journey__header">
            <p className="eyebrow">um pouco sobre a minha história</p>
            <h2 className="journey__title" data-split>
              MINHA JORNADA
            </h2>
          </header>

          <nav className="journey__nav" aria-label="Capítulos da jornada">
            <div className="journey__bar" aria-hidden="true">
              <span ref={barRef} />
            </div>
            <ul>
              {MILESTONES.map((m, i) => (
                <li key={m.title}>
                  <button
                    type="button"
                    className={i === active ? "is-active" : i < active ? "is-done" : ""}
                    onClick={() => goTo(i)}
                    aria-current={i === active ? "step" : undefined}
                    aria-label={`Capítulo ${i + 1}: ${m.title}`}
                    data-cursor="GO"
                  >
                    <i aria-hidden="true" />
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <em>{m.year}</em>
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
