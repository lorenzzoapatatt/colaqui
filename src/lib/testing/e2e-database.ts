export const E2E_DATABASE_NAME = "colaqui_e2e";

export function resolveE2EDatabaseUrl(
  applicationDatabaseUrl: string,
  explicitE2EDatabaseUrl?: string,
): string {
  const url = new URL(explicitE2EDatabaseUrl ?? applicationDatabaseUrl);

  if (explicitE2EDatabaseUrl) {
    if (decodeURIComponent(url.pathname) !== `/${E2E_DATABASE_NAME}`) {
      throw new Error(
        `E2E_DATABASE_URL deve apontar exclusivamente para ${E2E_DATABASE_NAME}.`,
      );
    }
    return url.toString();
  }

  url.pathname = `/${E2E_DATABASE_NAME}`;
  return url.toString();
}
