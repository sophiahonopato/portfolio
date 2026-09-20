import "./style.css";

// Imagens placeholder do Unsplash — troque pelas suas próprias fotos/prints
const ITEMS = [
  {
    category: "CÓDIGO",
    title: "Criando ideias através da tecnologia",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789829909/Design_sem_nome-13.png",
    span: "tall",
  },
  {
    category: "CONTEÚDO",
    title: "Compartilhando minha jornada",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789831131/Design_sem_nome-17.png",
    span: "short",
  },
  {
    category: "COMUNIDADE",
    title: "Conectando pessoas e tecnologia",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789830684/Design_sem_nome-15.png",
    span: "short",
  },
  {
    category: "TECNOLOGIA",
    title: "Uma paixão que começou desde pequena.",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789830124/Design_sem_nome-14.png",
    span: "tall",
  },
  {
    category: "CRIATIVIDADE",
    title: "Onde tecnologia encontra criatividade",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789830861/Design_sem_nome-16.png",
    span: "short",
  },
  {
    category: "FITNESS",
    title: "Uma paixão que faz parte da minha vida",
    image: "https://res.cloudinary.com/omtbpdcz/image/upload/v1789862788/Design_sem_nome-19.png",
    span: "short",
  },
];

export default function BeyondCode() {
  return (
    <section className="beyond" id="beyond-code">
      <div className="beyond__intro container">
        <p className="eyebrow">comunidades tech</p>
        <h2 className="beyond__title">
          É MAIS QUE APENAS
          <br />
          UM CÓDIGO.
        </h2>
      </div>

      <div className="beyond__grid container">
        {ITEMS.map((item) => (
          <div className={`beyond__item beyond__item--${item.span}`} key={item.title}>
            <img src={item.image} alt={item.title} loading="lazy" />
            <div className="beyond__item-overlay">
              <span className="beyond__item-category">{item.category}</span>
              <span className="beyond__item-title">{item.title}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
