import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-metadata";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-card" aria-labelledby="landing-title">
        <p className="eyebrow">Seu catálogo pessoal</p>
        <h1 id="landing-title">{APP_NAME}</h1>
        <p>{APP_DESCRIPTION}</p>
        <p className="status-pill">Fundação do catálogo em construção</p>
      </section>
    </main>
  );
}
