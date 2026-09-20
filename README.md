# Sophia Honorato — Portfolio

Portfólio pessoal editorial/premium, construído com React + Vite + GSAP
(ScrollTrigger) + Lenis + Three.js/React Three Fiber para a Hero 3D.

## Instalar e rodar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  App.jsx              → monta todas as seções + Lenis (smooth scroll)
  main.jsx             → entry point
  index.css            → design system global (cores, fontes, reset)
  hooks/
    useMagnetic.js      → efeito magnético reutilizável (botões/links)
  components/
    Cursor/             → cursor customizado (muda de conteúdo em hover)
    Nav/                → navegação minimalista + progresso de scroll + menu fullscreen
    Hero/               → hero com computador 3D controlado por scroll
    Hero3D/             → Canvas R3F: câmera, modelo do computador, tela/terminal
    Identity/           → manifesto, about, números e marquee de stack
    Work/               → "Selected Work" — spreads editoriais com scroll pinado
    Journey/            → timeline (pin horizontal no desktop, vertical no mobile)
    BeyondCode/         → galeria masonry (code/content/community/fitness/creativity/tech)
    Contact/            → CTA cinematográfico, fundo azul-claro
    Footer/             → footer minimalista
  data/
    projects.js         → dados dos 5 projetos do Work
public/
  models/               → pasta pronta para receber um computer.glb (opcional)
```

## O que ainda é placeholder (ajuste com seus dados reais)

- `Identity.jsx` → números da seção de stats (`STATS`)
- `Journey.jsx` → marcos da timeline (`MILESTONES`) — datas e textos são genéricos
- `BeyondCode.jsx` → imagens do Unsplash — troque pelas suas próprias fotos
- `Contact.jsx` → e-mail e links de redes sociais (`EMAIL`, `SOCIALS`)
- `data/projects.js` → categorias/descrições dos projetos 02–05 foram inferidas
  pelos títulos das páginas; ajuste se quiser algo mais preciso
- Modelo 3D do computador: por padrão usa primitivas (sem `.glb`). Para trocar
  por um modelo real, coloque o arquivo em `public/models/computer.glb` e
  passe `modelUrl="/models/computer.glb"` para `<Hero3D />` dentro de `Hero.jsx`

## Notas técnicas

- O cursor customizado desativa `cursor: none` automaticamente em dispositivos
  touch (`pointer: coarse`).
- `prefers-reduced-motion: reduce` desliga o Lenis, o 3D da Hero (mostra um
  fallback estático) e as animações de marquee/menu.
- A Hero3D é carregada via `React.lazy` + `Suspense`, então não pesa no
  carregamento inicial da página.
# portfolio
