import { useEffect, useRef, useState } from "react";
import { useMagnetic } from "../../hooks/useMagnetic";
import { lockScroll, scrollToTarget } from "../../lib/scroll";
import "./style.css";

const LINKS = [
  { label: "Projetos", href: "#work" },
  { label: "Jornada", href: "#journey" },
  { label: "Quem sou eu?", href: "#beyond-code" },
  { label: "Contato", href: "#contact" },
];

export default function Nav() {
  const progressRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useMagnetic(0.3);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const progress = height > 0 ? scrollTop / height : 0;
      // direto no DOM: evita re-renderizar o Nav a cada frame de scroll
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    lockScroll(menuOpen);
    if (!menuOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function handleLinkClick(e, href) {
    e.preventDefault();
    setMenuOpen(false);
    lockScroll(false); // destrava antes de rolar (o efeito acima só roda no próximo render)
    scrollToTarget(href);
  }

  return (
    <>
      {/* fora do <header>: o mix-blend-mode de lá inverteria a cor da barra */}
      <div className="nav__progress" aria-hidden="true">
        <div className="nav__progress-fill" ref={progressRef} />
      </div>

      <header className="nav">
        <a
          href="#hero"
          className="nav__logo"
          data-cursor="TOP"
          aria-label="Sophia Honorato — voltar ao topo"
          onClick={(e) => handleLinkClick(e, 0)}
        >
          SH.
        </a>

        <button
          ref={menuBtnRef}
          className={`nav__menu-btn ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="nav-overlay"
          data-cursor={menuOpen ? "CLOSE" : "MENU"}
        >
          <span />
          <span />
        </button>
      </header>

      <div id="nav-overlay" className={`nav__overlay ${menuOpen ? "is-open" : ""}`} inert={menuOpen ? undefined : ""}>
        <nav className="nav__overlay-links" aria-label="Seções">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className="nav__overlay-link"
              style={{ transitionDelay: `${i * 60}ms` }}
              onClick={(e) => handleLinkClick(e, link.href)}
              data-cursor="GO"
            >
              {link.label}
            </a>
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
