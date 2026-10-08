import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { projects } from "../../data/projects";
import { scrollToTarget } from "../../lib/scroll";
import { useMagnetic } from "../../hooks/useMagnetic";
import "./style.css";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

const pad = (n) => String(n).padStart(2, "0");
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, "");

export default function Projects() {
  const wrapRef = useRef(null);
  const stickyRef = useRef(null);
  const deckRef = useRef(null);
  const windowRefs = useRef([]);
  const panelRef = useRef(null);
  const nameRef = useRef(null);
  const ghostRef = useRef(null);
  const progressRef = useRef(null);
  const triggerRef = useRef(null);
  const linkRef = useMagnetic(0.3);

  const [active, setActive] = useState(0);
  const project = projects[active];

  // Deck 3D: as janelas dos projetos ficam empilhadas em profundidade. O scroll
  // move uma posição contínua `pos` (0 → n-1); quem está na frente sai voando
  // em direção à câmera e a fila inteira avança um lugar.
  useLayoutEffect(() => {
    let removeTilt = () => {};

    const ctx = gsap.context(() => {
      const windows = windowRefs.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wide = window.matchMedia("(min-width: 901px)").matches;
      // pose de descanso: virada para o texto no desktop, só deitada de leve no celular
      const rest = wide ? { x: 5, y: -16 } : { x: 7, y: 0 };
      const state = { pos: 0 };

      const layout = () => {
        windows.forEach((el, j) => {
          const d = j - state.pos;
          if (d >= 0) {
            // na fila: cada posição atrás recua, sobe e escurece
            gsap.set(el, {
              xPercent: d * (wide ? -10 : 4),
              yPercent: d * -14,
              z: d * -230,
              rotationX: rest.x,
              rotationY: rest.y - d * 5,
              opacity: gsap.utils.clamp(0, 1, 1 - d * 0.38),
            });
          } else {
            // saindo: voa para a frente e para o lado, girando
            const t = Math.min(1, -d);
            gsap.set(el, {
              xPercent: t * (wide ? -85 : -110),
              yPercent: t * 10,
              z: t * 460,
              rotationX: rest.x,
              rotationY: rest.y + t * 48,
              opacity: 1 - t * t,
            });
          }
          el.style.zIndex = String(Math.round(100 - d * 10));
          el.style.visibility = d < -0.98 || d > 3.2 ? "hidden" : "visible";
        });
      };

      layout();

      const tl = gsap.timeline({
        // onUpdate da timeline (e não do ScrollTrigger): com scrub ela continua
        // andando depois que o scroll para, e o deck precisa acompanhar
        onUpdate: () => {
          layout();
          setActive(gsap.utils.clamp(0, projects.length - 1, Math.round(state.pos)));
        },
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "+=" + (projects.length - 1) * 90 + "%",
          scrub: reduced ? true : 0.8,
          pin: stickyRef.current,
          onRefresh: (self) => (triggerRef.current = self),
        },
      });

      triggerRef.current = tl.scrollTrigger;

      // segura em cada projeto e depois troca
      tl.to({}, { duration: 0.35 });
      projects.forEach((_, i) => {
        if (i === 0) return;
        tl.to(state, { pos: i, duration: 0.55, ease: "power2.inOut" }).to({}, { duration: 0.35 });
      });

      // nome gigante ao fundo desliza na direção contrária, e a barra enche
      tl.fromTo(ghostRef.current, { xPercent: 6 }, { xPercent: -38, ease: "none", duration: tl.duration() }, 0);
      tl.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, ease: "none", duration: tl.duration() }, 0);

      if (reduced) return;

      // o deck flutua e inclina seguindo o mouse
      const deck = deckRef.current;
      gsap.to(deck, { y: -14, duration: 3.2, ease: "sine.inOut", repeat: -1, yoyo: true });

      if (window.matchMedia("(pointer: fine)").matches) {
        const rotateX = gsap.quickTo(deck, "rotationX", { duration: 0.7, ease: "power3.out" });
        const rotateY = gsap.quickTo(deck, "rotationY", { duration: 0.7, ease: "power3.out" });
        const sticky = stickyRef.current;

        const handleMove = (e) => {
          const rect = sticky.getBoundingClientRect();
          rotateY(((e.clientX - rect.left) / rect.width - 0.5) * 14);
          rotateX(((e.clientY - rect.top) / rect.height - 0.5) * -10);
        };
        const handleLeave = () => {
          rotateX(0);
          rotateY(0);
        };

        sticky.addEventListener("pointermove", handleMove);
        sticky.addEventListener("pointerleave", handleLeave);
        removeTilt = () => {
          sticky.removeEventListener("pointermove", handleMove);
          sticky.removeEventListener("pointerleave", handleLeave);
        };
      }
    }, wrapRef);

    return () => {
      removeTilt();
      triggerRef.current = null;
      ctx.revert();
    };
  }, []);

  // Troca de projeto: o nome "decodifica" letra a letra e o resto levanta em 3D
  const firstRun = useRef(true);
  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        nameRef.current,
        { scrambleText: { text: " ", chars: "01<>/{}[]#", speed: 0.6 } },
        { scrambleText: { text: projects[active].name, chars: "01<>/{}[]#", speed: 0.6 }, duration: 0.7, ease: "none" }
      );
      gsap.fromTo(
        ".work__rise",
        { opacity: 0, y: 34, rotationX: -55, transformPerspective: 700, transformOrigin: "50% 100%" },
        { opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }
      );
      gsap.fromTo(
        ".work__stack li",
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.05, delay: 0.15 }
      );
    }, panelRef);

    return () => ctx.revert();
  }, [active]);

  function goTo(index) {
    const trigger = triggerRef.current;
    if (!trigger) return;
    // cada projeto "descansa" no meio do seu trecho da timeline
    const total = (projects.length - 1) * 0.9 + 0.35;
    const at = (index * 0.9 + 0.175) / total;
    scrollToTarget(trigger.start + (trigger.end - trigger.start) * at);
  }

  return (
    <section className="work" id="work">
      <div className="work__intro container">
        <p className="eyebrow">Alguns Projetos</p>
        <h2 className="work__title" data-split>
          Projetos
          <br />
          Reais
        </h2>
      </div>

      <div className="work__pin" ref={wrapRef}>
        <div className="work__sticky" ref={stickyRef}>
          {/* nome do projeto gigante ao fundo */}
          <div className="work__ghost" aria-hidden="true">
            <span ref={ghostRef}>
              {project.name} — {project.name} — {project.name}
            </span>
          </div>

          <div className="work__grid container">
            <div className="work__info" ref={panelRef}>
              <div className="work__panel" aria-live="polite">
                <span className="work__number work__rise">{project.id}</span>
                <h3 className="work__name" ref={nameRef}>
                  {project.name}
                </h3>
                <p className="work__category work__rise">{project.category}</p>
                <p className="work__description work__rise">{project.description}</p>
                <ul className="work__stack">
                  {project.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="work__rise">
                  <a ref={linkRef} className="work__link" href={project.url} target="_blank" rel="noreferrer" data-cursor="OPEN ↗">
                    Ver projeto <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div className="work__count">
                <span>
                  {pad(active + 1)} / {pad(projects.length)}
                </span>
                <span className="work__progress" aria-hidden="true">
                  <span ref={progressRef} />
                </span>
              </div>

              <ul className="work__dots">
                {projects.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={i === active ? "is-active" : ""}
                      onClick={() => goTo(i)}
                      aria-label={`Projeto ${i + 1}: ${p.name}`}
                      aria-current={i === active ? "true" : undefined}
                      data-cursor="GO"
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="work__visual">
              <div className="work__deck" ref={deckRef}>
                {projects.map((p, i) => (
                  <a
                    className={`work__window ${i === active ? "is-active" : ""}`}
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="VIEW PROJECT ↗"
                    ref={(el) => (windowRefs.current[i] = el)}
                    style={{ pointerEvents: i === active ? "auto" : "none" }}
                    tabIndex={i === active ? 0 : -1}
                  >
                    <span className="work__chrome" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <span>{host(p.url)}</span>
                      <em>online</em>
                    </span>
                    <span className="work__screen">
                      <img src={p.image} alt={`Tela inicial do projeto ${p.name}`} loading="lazy" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
