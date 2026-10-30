export class ProductError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly code: string,
  ) {
    super(detail);
    this.name = "ProductError";
  }
}

export class InvalidProductTransitionError extends ProductError {
  constructor(from: string, to: string) {
    super(
      409,
      "Transição inválida",
      `O produto não pode mudar de ${from} para ${to}.`,
      "INVALID_PRODUCT_TRANSITION",
    );
  }
}

export class ProductNotFoundError extends ProductError {
  constructor() {
    super(404, "Produto não encontrado", "O produto não existe.", "PRODUCT_NOT_FOUND");
  }
}

export class ProductVersionConflictError extends ProductError {
  constructor() {
    super(
      409,
      "Produto alterado",
      "O produto foi alterado em outra tela. Recarregue e tente novamente.",
      "PRODUCT_VERSION_CONFLICT",
    );
  }
}

export class ProductHasActiveListingsError extends ProductError {
  constructor() {
    super(
      409,
      "Produto possui anúncios ativos",
      "Encerre os anúncios ativos antes de arquivar este produto.",
      "PRODUCT_HAS_ACTIVE_LISTINGS",
    );
  }
}
