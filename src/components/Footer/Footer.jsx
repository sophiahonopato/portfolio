import "./style.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <span>© {new Date().getFullYear()} Sophia Honorato</span>
        <a href="#hero" data-cursor="TOP">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
