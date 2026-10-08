import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STAGES, getStage } from "../Hero3D/stages";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const Hero3D = lazy(() => import("../Hero3D/Hero3D"));

const FLOATING_TAGS = ["React", "JavaScript", "IoT", "Web", "GSAP"];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e) => setMatches(e.matches);
    mql.addEventListener
      ? mql.addEventListener("change", handler)
      : mql.addListener(handler);

    return () => {
      mql.removeEventListener
        ? mql.removeEventListener("change", handler)
        : mql.removeListener(handler);
    };
  }, [query]);

  return matches;
}


export default function Hero() {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const progressRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // tags flutuantes e "scroll" só fazem sentido na abertura
  const [introVisible, setIntroVisible] = useState(true);
  // HUD: estágio atual da narrativa do scroll
  const [stageIndex, setStageIndex] = useState(0);
  const hudBarRef = useRef(null);
  const hudLabelRef = useRef(null);

  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 768px)");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=350%",
        scrub: 1,
        pin: stickyRef.current,
        invalidateOnRefresh: true,
        // Primeira seção da página: é medida antes de Projects (2) e Journey (1).
        refreshPriority: 3,
        onUpdate: (self) => {
          progressRef.current = self.progress;

          setIntroVisible(self.progress < 0.06);
          setStageIndex(STAGES.indexOf(getStage(self.progress)));
          if (hudBarRef.current) hudBarRef.current.style.transform = `scaleY(${self.progress})`;
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Entrada das tags e do HUD, sincronizada com o boot do PC
  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero__tag-wrap", {
        opacity: 0,
        scale: 0.6,
        y: 24,
        duration: 0.9,
        ease: "back.out(1.8)",
        stagger: 0.09,
        delay: 2.3,
      });
      gsap.from(".hero__title > *", { opacity: 0, y: 28, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 1.6 });
      gsap.from(".hero__hud, .hero__scroll-hint", { opacity: 0, y: 16, duration: 0.8, ease: "power3.out", delay: 2.8 });
    }, sectionRef);
    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // troca do rótulo do HUD: o texto novo sobe por baixo da máscara
  useLayoutEffect(() => {
    if (prefersReducedMotion || !hudLabelRef.current) return;
    const tween = gsap.fromTo(
      hudLabelRef.current,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.5, ease: "power3.out" }
    );
    return () => tween.kill();
  }, [stageIndex, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;

    function handlePointerMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseRef.current = { x, y };
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion, isMobile]);

  return (
    <section className="hero" id="hero" ref={sectionRef}>
      <div className="hero__sticky" ref={stickyRef}>
        <div className="hero__stage">
          {prefersReducedMotion ? (
            <StaticHeroFallback />
          ) : (
            <Suspense fallback={<StaticHeroFallback loading />}>
              <Hero3D
                progressRef={progressRef}
                mouseRef={mouseRef}
                isMobile={isMobile}
                prefersReducedMotion={prefersReducedMotion}
              />
            </Suspense>
          )}
        </div>

        <h1 className="sr-only">Sophia Honorato — Creative Developer</h1>

        {/* Em telas em pé o setup aparece inteiro e o monitor fica pequeno:
            o nome ganha uma versão grande em HTML por cima (só no CSS de retrato). */}
        <div className={`hero__title ${introVisible ? "" : "is-hidden"}`} aria-hidden="true">
          <span className="hero__title-eyebrow">Creative Developer</span>
          <span className="hero__title-name">Sophia</span>
          <span className="hero__title-name hero__title-name--outline">Honorato</span>
        </div>

        <div className={`hero__tags ${introVisible ? "" : "is-hidden"}`} aria-hidden="true">
          {FLOATING_TAGS.map((tag, i) => (
            <span key={tag} className={`hero__tag-wrap hero__tag--${i}`}>
              <span className="hero__tag">{tag}</span>
            </span>
          ))}
        </div>

        <div className="hero__hud" aria-hidden="true">
          <span className="hero__hud-index">
            {String(stageIndex + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          </span>
          <span className="hero__hud-mask">
            <span className="hero__hud-label" ref={hudLabelRef}>
              {STAGES[stageIndex].label}
            </span>
          </span>
        </div>

        <div className="hero__rail" aria-hidden="true">
          <span ref={hudBarRef} />
        </div>

        <div className={`hero__scroll-hint ${introVisible ? "" : "is-hidden"}`} aria-hidden="true">
          <span />
          scroll
        </div>
      </div>
    </section>
  );
}

// Versão leve/estática usada durante o carregamento do 3D, em prefers-reduced-motion,
// ou como base para um fallback de dispositivos muito fracos.
function StaticHeroFallback({ loading = false }) {
  return (
    <div className={`hero__fallback ${loading ? "is-loading" : ""}`}>
      <div className="hero__fallback-monitor">
        <div className="hero__fallback-screen hero__fallback-screen--identity">
          <span className="hero__fallback-eyebrow">Creative Developer</span>
          <p className="hero__fallback-name">
            Sophia
            <br />
            Honorato
          </p>
          <span className="hero__fallback-meta">
            {loading ? "loading..." : "React · JavaScript · GSAP · Web"}
          </span>
        </div>
      </div>
    </div>
  );
}