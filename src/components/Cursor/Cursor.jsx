import { useEffect, useRef, useState } from "react";
import "./style.css";

export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    setEnabled(isFinePointer);
    if (!isFinePointer) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pos.x, y: pos.y };

    function handleMove(e) {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }

      const target = e.target.closest("[data-cursor]");
      setLabel(target ? target.getAttribute("data-cursor") : "");
    }

    let rafId;
    function tick() {
      ring.x += (pos.x - ring.x) * 0.15;
      ring.y += (pos.y - ring.y) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px)`;
      }
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className={`cursor-monitor ${label ? "has-label" : ""}`}>
        <svg viewBox="0 0 48 40" className="cursor-monitor__svg" aria-hidden="true">
          {/* Corpo do monitor */}
          <rect x="3" y="3" width="42" height="27" rx="3" className="cursor-monitor__frame" />
          {/* Tela */}
          <rect x="6.5" y="6.5" width="35" height="20" rx="1.5" className="cursor-monitor__screen" />
          {/* Pé */}
          <rect x="21" y="30" width="6" height="5" className="cursor-monitor__frame" />
          <rect x="15" y="35" width="18" height="2.5" rx="1.25" className="cursor-monitor__frame" />
        </svg>
        {label && <span className="cursor-monitor__label">{label}</span>}
      </div>
    </>
  );
}