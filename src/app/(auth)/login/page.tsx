import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Seu catálogo pessoal</p>
        <h1 id="login-title">Entre no Colaqui</h1>
        <p>Acesse seus anúncios e continue de onde parou.</p>

        <form className="auth-form" action="/api/auth/login" method="post">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <button type="submit">Entrar</button>
        </form>

        <p className="auth-switch">
          Primeiro acesso? <Link href="/setup">Configurar</Link>
        </p>
      </section>
    </main>
  );
}
