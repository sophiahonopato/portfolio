import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const Hero3D = lazy(() => import("../Hero3D/Hero3D"));

const FLOATING_TAGS = ["React", "JavaScript", "IoT", "Web", "GSAP"];

const HEADINGS = {
  start: null,
  wake: null,
  orbit: null,
  code: null,
  whoami: null,
  projects: null,
};

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

  const [heading, setHeading] = useState(null);
  const [introVisible, setIntroVisible] = useState(true);
  const lastStageRef = useRef("start");

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

          setIntroVisible(self.progress < 0.08);

          const stageId = resolveStageId(self.progress);
          if (stageId !== lastStageRef.current) {
            lastStageRef.current = stageId;
            setHeading(HEADINGS[stageId] ?? null);
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

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

        <div className="hero__tags" aria-hidden="true">
          {FLOATING_TAGS.map((tag, i) => (
            <span key={tag} className={`hero__tag hero__tag--${i}`}>
              {tag}
            </span>
          ))}
        </div>

        {heading && (
          <div className="hero__heading">
            <h2>{heading}</h2>
          </div>
        )}

        <div className="hero__scroll-hint" aria-hidden="true">
          <span />
          scroll
        </div>
      </div>
    </section>
  );
}

function resolveStageId(progress) {
  if (progress < 0.15) return "start";
  if (progress < 0.32) return "wake";
  if (progress < 0.5) return "orbit";
  if (progress < 0.68) return "code";
  if (progress < 0.85) return "whoami";
  return "projects";
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