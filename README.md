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
  index.css            → design system global (paleta neon, fontes, reset)
  hooks/
    useMagnetic.js      → efeito magnético reutilizável (botões/links)
    usePageAnimations.js → animações de scroll (GSAP + SplitText) por atributos data-*
  lib/
    scroll.js           → acesso compartilhado ao Lenis (scroll até âncora, travar scroll do menu)
  components/
    Cursor/             → cursor customizado (muda de conteúdo em hover)
    Nav/                → navegação minimalista + progresso de scroll + menu fullscreen
    Hero/               → hero com computador 3D controlado por scroll
    Hero3D/             → Canvas R3F: câmera, modelo do computador, tela/terminal
    Identity/           → manifesto, about, números e marquee de stack
    Work/               → projetos num deck 3D de janelas (o scroll faz a fila avançar)
    Journey/            → voo 3D por um trilho com um portal por marco (Journey3D.jsx)
    BeyondCode/         → cena 3D própria: núcleo + 6 objetos em órbita, um por faceta (Facets3D.jsx)
    Contact/            → CTA cinematográfico, fundo azul-claro
    Footer/             → footer minimalista
    World3D/            → mundo 3D fixo atrás da página (voo guiado pelo scroll)
  data/
    projects.js         → dados dos projetos do Work (prints locais ficam em public/projects/)
public/
  models/               → pasta pronta para receber um computer.glb (opcional)
```

## O que ainda é placeholder (ajuste com seus dados reais)

- `Identity.jsx` → números da seção de stats (`STATS`)
- `Journey.jsx` → marcos da timeline (`MILESTONES`) — datas e textos são genéricos
- `BeyondCode.jsx` → textos das facetas (`FACETS`); cada `id` tem um objeto 3D
  correspondente em `Facets3D.jsx` (`OBJECTS`)
- `Contact.jsx` → e-mail e links de redes sociais (`EMAIL`, `SOCIALS`)
- `data/projects.js` → categorias/descrições dos projetos 02–05 foram inferidas
  pelos títulos das páginas; ajuste se quiser algo mais preciso
- Modelo 3D do computador: por padrão usa primitivas (sem `.glb`). Para trocar
  por um modelo real, coloque o arquivo em `public/models/computer.glb` e
  passe `modelUrl="/models/computer.glb"` para `<Hero3D />` dentro de `Hero.jsx`

## Notas técnicas

- A tela do monitor (`Hero3D/Screen.jsx`) é HTML de 400 × 228px encaixado na
  área útil do modelo 3D pelo `SCREEN_SCALE`. Se trocar o modelo, ajuste essa
  constante — não a largura no CSS.
- A câmera (`Hero3D/CameraController.jsx`) enquadra por `fitW`/`fitH`: cada
  keyframe diz quanto da cena precisa caber na tela e a distância é calculada
  a partir do formato da janela. Para aproximar/afastar, mude esses valores.
- O render 3D pausa sozinho quando o hero sai da tela.
- O site inteiro segue a estética da cena 3D: fundo noite, neon azul/violeta,
  rótulos em fonte mono no estilo terminal. A paleta fica nas variáveis do
  `index.css` (`--bg`, `--accent`, `--violet`...); a cor de fundo da cena
  (`NIGHT` em `Hero3D/Hero3D.jsx`) precisa bater com `--bg`.
- Ao carregar roda uma sequência de boot (`bootRef`, 0 → 1 via GSAP): câmera,
  luzes, teclado e tela leem esse valor a cada frame.
- O setup (monitor, teclado RGB, gabinete, fans) é feito de primitivas em
  `Hero3D/ComputerModel.jsx`; os estágios do scroll ficam em `Hero3D/stages.js`.
- Atrás da página inteira roda um segundo canvas fixo (`World3D/World3D.jsx`):
  a câmera avança por um mundo 3D conforme o scroll. Ele não renderiza
  enquanto o hero cobre a tela e fica desligado com movimento reduzido
  (aí aparece o grid em CSS do `index.css`). O fundo da página precisa ficar
  só no `<html>` — um fundo no `<body>` cobriria esse canvas.
- O conteúdo ganha profundidade por atributos: `data-tilt` (inclina com o
  mouse), `data-reveal` / `data-reveal="flip"` (entra em perspectiva). A
  Jornada vira um coverflow e a janela dos Projetos flutua inclinada.
- Animações de scroll do resto da página são declarativas, via atributos
  (`data-split`, `data-scrub-text`, `data-reveal`, `data-count`,
  `data-parallax`, `data-marquee`, `data-draw`) — ver `hooks/usePageAnimations.js`.

- O cursor customizado desativa `cursor: none` automaticamente em dispositivos
  touch (`pointer: coarse`).
- `prefers-reduced-motion: reduce` desliga o Lenis, o 3D da Hero (mostra um
  fallback estático) e as animações de marquee/menu.
- A Hero3D é carregada via `React.lazy` + `Suspense`, então não pesa no
  carregamento inicial da página.
# portfolio
