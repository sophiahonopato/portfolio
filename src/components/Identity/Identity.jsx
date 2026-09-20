import "./style.css";

const STATS = [
  { value: "10+", label: "Projetos já feitos" }, // placeholder — ajuste com números reais
  { value: "1+", label: "Anos codando" },
  { value: "3", label: "Comunidades que eu faço parte" },
];

const STACK = ["React", "JavaScript", "CSS", "GSAP", "Three.js", "Vite", "Node.js", "IoT", "Figma", "Git"];

export default function Identity() {
  return (
    <section className="identity" id="identity">
      <div className="identity__manifesto container">
        <p className="eyebrow">sobre mim</p>
        <h2 className="identity__line">NÃO ESPERO A IDEIA PERFEITA.</h2>
        <h2 className="identity__line identity__line--accent">EU COMEÇO A CONSTRUÍ-LA.</h2>
      </div>

      <div className="identity__about container">
        <div className="identity__about-text">
          <p className="eyebrow">Quem sou eu?</p>
          <p className="identity__paragraph">
              Olá, eu sou a Sophia Honorato!

Sou estudante do 3º ano de IoT no Senac e comecei a programar em novembro de 2025. Desde então, venho construindo minha trajetória na tecnologia por meio de projetos, certificações, eventos e criação de conteúdo.

Compartilho minha jornada no TikTok (@honorato.exe) e Instagram (@sosohonorato.exe). Já participei de um podcast do Café em Código, palestrei na FIAP e faço parte das comunidades Conecta Devs, WoHackathon e Café Bugado. Também tenho parceria com a UseTI.

Sigo estudando, criando e buscando novas oportunidades para crescer cada vez mais na tecnologia.

          </p>
        </div>

         

        <div className="identity__stats">
          {STATS.map((stat) => (
            <div className="identity__stat" key={stat.label}>
              <span className="identity__stat-value">{stat.value}</span>
              <span className="identity__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="identity__marquee" aria-hidden="true">
        <div className="identity__marquee-track">
          {[...STACK, ...STACK].map((tech, i) => (
            <span key={`${tech}-${i}`} className="identity__marquee-item">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
