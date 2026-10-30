import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="setup-title">
        <p className="eyebrow">Primeiro acesso</p>
        <h1 id="setup-title">Configure seu Colaqui</h1>
        <p>
          Crie o acesso único para organizar e vender somente os seus objetos.
        </p>

        <form className="auth-form" action="/api/auth/setup" method="post">
          <label htmlFor="setup-email">E-mail</label>
          <input
            id="setup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="setup-password">Senha</label>
          <input
            id="setup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <p className="field-hint">Use entre 12 e 128 caracteres.</p>

          <button type="submit">Criar acesso</button>
        </form>

        <p className="auth-switch">
          Já configurou? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
