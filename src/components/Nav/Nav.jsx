import { useEffect, useRef, useState } from "react";
import { useMagnetic } from "../../hooks/useMagnetic";
import "./style.css";

const LINKS = [
  { label: "Projetos", href: "#work" },
  { label: "Jornada", href: "#journey" },
  { label: "Quem sou eu?", href: "#beyond-code" },
  { label: "Contato", href: "#contact" },
];

export default function Nav() {
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useMagnetic(0.3);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      setProgress(height > 0 ? scrollTop / height : 0);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  function handleLinkClick(href) {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <header className="nav">
        <a href="#hero" className="nav__logo" data-cursor="TOP">
          SH.
        </a>

        <div className="nav__progress" aria-hidden="true">
          <div className="nav__progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>

        <button
          ref={menuBtnRef}
          className={`nav__menu-btn ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          data-cursor={menuOpen ? "CLOSE" : "MENU"}
        >
          <span />
          <span />
        </button>
      </header>

      <div className={`nav__overlay ${menuOpen ? "is-open" : ""}`}>
        <nav className="nav__overlay-links">
          {LINKS.map((link, i) => (
            <button
              key={link.href}
              className="nav__overlay-link"
              style={{ transitionDelay: `${i * 60}ms` }}
              onClick={() => handleLinkClick(link.href)}
              data-cursor="GO"
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="nav__overlay-footer">
          <span>sophia.honorato</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </>
  );
}
