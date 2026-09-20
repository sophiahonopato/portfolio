import { useMagnetic } from "../../hooks/useMagnetic";
import "./style.css";

// Ajuste com seus contatos reais
const EMAIL = "sophiahonoratodev@gmail.con";
const SOCIALS = [
  { label: "GitHub", href: "https://github.com/sophiahonopato" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sophiahonorato/" },
  { label: "Instagram", href: "https://www.instagram.com/sosohonorato.exe/" },
];

export default function Contact() {
  const ctaRef = useMagnetic(0.25);

  return (
    <section className="contact" id="contact">
      <div className="contact__inner container">
        <p className="eyebrow">entre em contato!</p>
        <h2 className="contact__title">
          VAMOS CRIAR
          <br />
          ALGO <span>JUNTOS?</span>
        </h2>

        <a ref={ctaRef} href={`mailto:${EMAIL}`} className="contact__cta" data-cursor="SAY HI ↗">
          {EMAIL}
        </a>

        <div className="contact__socials">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" data-cursor="OPEN">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
