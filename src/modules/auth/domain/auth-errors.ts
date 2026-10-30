export class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly code: string,
  ) {
    super(detail);
    this.name = "AuthError";
  }
}

export class OwnerAlreadyConfiguredError extends AuthError {
  constructor() {
    super(
      409,
      "Proprietário já configurado",
      "O proprietário deste Colaqui já foi configurado.",
      "OWNER_ALREADY_CONFIGURED",
    );
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super(
      401,
      "Não foi possível entrar",
      "E-mail ou senha inválidos.",
      "INVALID_CREDENTIALS",
    );
  }
}

export class LoginRateLimitedError extends AuthError {
  constructor() {
    super(
      429,
      "Muitas tentativas",
      "Muitas tentativas. Tente novamente mais tarde.",
      "LOGIN_RATE_LIMITED",
    );
  }
}

export class AuthenticationRequiredError extends AuthError {
  constructor() {
    super(
      401,
      "Autenticação necessária",
      "Entre novamente para continuar.",
      "AUTHENTICATION_REQUIRED",
    );
  }
}
