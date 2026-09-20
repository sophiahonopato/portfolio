import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects } from "../../data/projects";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

export default function Projects() {
  const wrapRef = useRef(null);
  const stickyRef = useRef(null);
  const panelRefs = useRef([]);
  const numberRefs = useRef([]);
  const nameRefs = useRef([]);
  const categoryRefs = useRef([]);
  const stackRefs = useRef([]);
  const imageRefs = useRef([]);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(panelRefs.current.slice(1), { opacity: 0 });
      gsap.set(imageRefs.current.slice(1), { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "+=" + (projects.length * 100 + 40) + "%",
          scrub: 1,
          pin: stickyRef.current,
          onUpdate: (self) => {
            const idx = Math.min(
              projects.length - 1,
              Math.floor(self.progress * projects.length + 0.001)
            );
            setActive(idx);
          },
        },
      });

      projects.forEach((_, i) => {
        if (i > 0) {
          tl.to(panelRefs.current[i - 1], { opacity: 0, yPercent: -6, duration: 0.15 }).to(
            imageRefs.current[i - 1],
            { opacity: 0, scale: 1.08, yPercent: -6, filter: "blur(10px)", duration: 0.2 },
            "<"
          );
        }

        tl.fromTo(
          numberRefs.current[i],
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.1 },
          i > 0 ? ">-0.05" : 0
        )
          .fromTo(nameRefs.current[i], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.12 }, "-=0.03")
          .fromTo(categoryRefs.current[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.1 }, "-=0.04")
          .fromTo(stackRefs.current[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.1 }, "-=0.04")
          .to(panelRefs.current[i], { opacity: 1, duration: 0.01 }, "<")
          .fromTo(
            imageRefs.current[i],
            { opacity: 0, scale: 1.1, xPercent: 8, filter: "blur(12px)" },
            { opacity: 1, scale: 1, xPercent: 0, filter: "blur(0px)", duration: 0.22 },
            "<"
          )
          .to({}, { duration: 0.5 });
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="work" id="work">
      <div className="work__intro container">
        <p className="eyebrow">Alguns Projetos</p>
        <h2 className="work__title">
          Projetos
          <br />
          Reais
        </h2>
      </div>

      <div className="work__pin" ref={wrapRef}>
        <div className="work__sticky" ref={stickyRef}>
          <div className="work__grid container">
            <div className="work__info">
              {projects.map((p, i) => (
                <div className="work__panel" key={p.id} ref={(el) => (panelRefs.current[i] = el)}>
                  <span className="work__number" ref={(el) => (numberRefs.current[i] = el)}>{p.id}</span>
                  <h3 className="work__name" ref={(el) => (nameRefs.current[i] = el)}>{p.name}</h3>
                  <p className="work__category" ref={(el) => (categoryRefs.current[i] = el)}>{p.category}</p>
                  <ul className="work__stack" ref={(el) => (stackRefs.current[i] = el)}>
                    {p.stack.map((s) => (<li key={s}>{s}</li>))}
                  </ul>
                </div>
              ))}
              <p className="work__count">{String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</p>
            </div>

            <div className="work__visual">
              {projects.map((p, i) => (
                <a className="work__image-wrap" key={p.id} href={p.url} target="_blank" rel="noreferrer" data-cursor="VIEW PROJECT ↗" ref={(el) => (imageRefs.current[i] = el)} style={{ pointerEvents: i === active ? "auto" : "none" }} tabIndex={i === active ? 0 : -1}>
                  <img src={p.image} alt={p.name} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}