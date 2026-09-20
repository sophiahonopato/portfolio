import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import Cursor from "./components/Cursor/Cursor";
import Nav from "./components/Nav/Nav";
import Hero from "./components/Hero/Hero";
import Identity from "./components/Identity/Identity";
import Projects from "./components/Work/Projects";
import Journey from "./components/Journey/Journey";
import BeyondCode from "./components/BeyondCode/BeyondCode";
import Contact from "./components/Contact/Contact";
import Footer from "./components/Footer/Footer";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    gsap.ticker.lagSmoothing(0);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Refresh global do ScrollTrigger depois que a página estiver totalmente
  // "assentada" — cobre fontes customizadas carregando tarde e o Hero3D
  // (lazy-loaded) montando de forma assíncrona, que mudam a altura de
  // seções e desalinham os pins calculados antes deles existirem.
  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    // 1) assim que as fontes web terminarem de carregar
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }

    // 2) assim que todo o conteúdo da página (imagens, etc.) carregar
    window.addEventListener("load", refresh);

    // 3) fallback pragmático: cobre o Hero3D lazy-loaded, que não tem um
    // hook de "terminou de montar" acessível daqui. Um pequeno atraso
    // dá tempo dele montar mesmo em conexões/dispositivos mais lentos.
    const fallbackId = setTimeout(refresh, 1200);

    return () => {
      cancelled = true;
      window.removeEventListener("load", refresh);
      clearTimeout(fallbackId);
    };
  }, []);

  return (
    <>
      <Cursor />
      <Nav />
      <main>
        <Hero />
        <Identity />
        <Projects />
        <Journey />
        <BeyondCode />
        <Contact />
      </main>
      <Footer />
    </>
  );
}