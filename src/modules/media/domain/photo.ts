export class MediaError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly code: string,
  ) {
    super(detail);
    this.name = "MediaError";
  }
}

export class PhotoTooLargeError extends MediaError {
  constructor() {
    super(
      413,
      "Foto muito grande",
      "A foto ultrapassa o limite permitido.",
      "PHOTO_TOO_LARGE",
    );
  }
}

export class UnsupportedPhotoTypeError extends MediaError {
  constructor() {
    super(
      415,
      "Formato de foto não aceito",
      "Envie uma imagem JPEG, PNG ou WebP válida.",
      "UNSUPPORTED_PHOTO_TYPE",
    );
  }
}

export class PhotoLimitReachedError extends MediaError {
  constructor() {
    super(
      409,
      "Limite de fotos atingido",
      "Remova uma foto antes de enviar outra.",
      "PHOTO_LIMIT_REACHED",
    );
  }
}

export class InvalidPhotoOrderError extends MediaError {
  constructor() {
    super(
      409,
      "Ordem de fotos inválida",
      "A ordem deve conter cada foto ativa exatamente uma vez.",
      "INVALID_PHOTO_ORDER",
    );
  }
}

export class PhotoNotFoundError extends MediaError {
  constructor() {
    super(404, "Foto não encontrada", "A foto não existe.", "PHOTO_NOT_FOUND");
  }
}

export function validatePhotoSize(size: number, maximum: number): void {
  if (!Number.isSafeInteger(size) || size < 1 || size > maximum) {
    throw new PhotoTooLargeError();
  }
}
