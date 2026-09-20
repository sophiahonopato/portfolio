import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const MILESTONES = [
  { year: "2025", title: "Primeira vez que eu faço um curso exclusivo de programação", text: "Comecei fazendo um curso de programação em novembro de 2025 para desenvolvimento web, aonde aprendi muitas habilidades e desde lá não parei mais kk." },
  { year: "2025", title: "Fazendo muitos cursos", text: "O final do ano eu estudei muito a parte teória e aprendi muitas coisas em cursos online gratuitos." },
  { year: "2026", title: "Minha virada de chave", text: "Em 2026 comecei a programar na prática e fazer muitos projetos fullstack e fechar contratos reais" },
  { year: "2026", title: "Comunidades e Eventos tech", text: "Comecei a me envolver com eventos e comunidades de tecnologia, virou parte da rotina criar conteúdo para as comunidades e ir para eventos tech antes da aula." },
  { year: "2026", title: "Criação de conteúdo", text: "Passei a compartilhar meu processo de aprendizado publicamente, e ajudar pessoas da comunidade a se desenvolverem" },
  { year: "2026", title: "Always building", text: "Seguindo em construção — novos projetos, novas experiências." },
];

export default function Journey() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 861px)", () => {
        const track = trackRef.current;

        // função em vez de valor fixo: recalcula sob demanda a cada refresh
        const getDistance = () => track.scrollWidth - window.innerWidth + 160;

        const tween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => "+=" + getDistance(),
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        return () => tween.scrollTrigger?.kill();
      });

      // Mobile: sem pin, apenas fade-in de cada card ao entrar na tela
      mm.add("(max-width: 860px)", () => {
        gsap.utils.toArray(".journey__card").forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              scrollTrigger: { trigger: card, start: "top 85%" },
            }
          );
        });
      });

      return () => mm.revert();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="journey" id="journey" ref={sectionRef}>
      <div className="journey__intro container">
        <p className="eyebrow">um pouco sobre a minha história</p>
        <h2 className="journey__title">MINHA JORNADA</h2>
      </div>

      <div className="journey__track" ref={trackRef}>
        {MILESTONES.map((m) => (
          <div className="journey__card" key={m.year}>
            <span className="journey__year">{m.year}</span>
            <h3 className="journey__card-title">{m.title}</h3>
            <p className="journey__card-text">{m.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}