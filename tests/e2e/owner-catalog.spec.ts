import sharp from "sharp";
import { expect, test } from "@playwright/test";

const owner = {
  email: "dono-e2e@example.com",
  password: "senha-segura-e2e-123",
};

async function syntheticPhoto(color: string, name: string) {
  return {
    name,
    mimeType: "image/jpeg",
    buffer: await sharp({
      create: {
        width: 180,
        height: 120,
        channels: 3,
        background: color,
      },
    })
      .jpeg()
      .toBuffer(),
  };
}

test("owner manages one personal used product from setup through archive", async ({
  page,
}) => {
  await page.goto("/setup");
  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill(owner.password);
  await page.getByRole("button", { name: "Criar acesso" }).click();
  await expect(page).toHaveURL(/\/login\?configured=1$/);

  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill(owner.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "O que vamos vender hoje?" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill(owner.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.getByRole("link", { name: "Cadastrar produto" }).click();
  await page.getByLabel("Título").fill("Cadeira pessoal usada");
  await page
    .getByLabel("Descrição")
    .fill("Cadeira pessoal usada, firme, limpa e em bom estado de conservação.");
  await page.getByLabel("Estado do item").selectOption("GOOD");
  await page.getByLabel("Preço (R$)").fill("123,45");
  await page.getByLabel("Categoria").fill("Móveis");
  await page.getByLabel("Cidade ou região").fill("São Paulo - SP");
  await page.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByRole("status")).toContainText("Produto salvo");
  await page.getByRole("link", { name: "Abrir produto" }).click();

  const input = page.getByLabel("Adicionar foto");
  await input.setInputFiles(await syntheticPhoto("#b94c42", "vermelha.jpg"));
  await expect(page.getByRole("img", { name: "Foto 1 do produto" })).toBeVisible();
  await input.setInputFiles(await syntheticPhoto("#4269b9", "azul.jpg"));
  await expect(page.getByRole("img", { name: "Foto 2 do produto" })).toBeVisible();

  const firstSource = await page
    .getByRole("img", { name: "Foto 1 do produto" })
    .getAttribute("src");
  await page.getByRole("button", { name: "Mover foto 1 para a direita" }).click();
  const firstObjectPath = new URL(firstSource ?? "http://invalid").pathname;
  await expect
    .poll(async () => {
      const source = await page
        .getByRole("img", { name: "Foto 2 do produto" })
        .getAttribute("src");
      return new URL(source ?? "http://invalid").pathname;
    })
    .toBe(firstObjectPath);

  await page.getByRole("link", { name: "Editar produto" }).click();
  await page.getByLabel("Título").fill("Cadeira pessoal usada e revisada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Produto salvo");
  await page.getByRole("link", { name: "Abrir produto" }).click();
  await expect(
    page.getByRole("heading", { name: "Cadeira pessoal usada e revisada" }),
  ).toBeVisible();

  expect(new URL(page.url()).origin).toBe("http://localhost:3002");
  await expect
    .poll(async () =>
      (await page.context().cookies()).some(
        (cookie) =>
          cookie.name === "colaqui_session" && cookie.domain === "localhost",
      ),
    )
    .toBe(true);
  await page.goto("/");
  await expect(page.getByText("Rascunhos").locator("..")).toContainText("1");
  await page.getByRole("link", { name: "Cadeira pessoal usada e revisada" }).click();
  await page.getByRole("button", { name: "Arquivar produto" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText("Nenhum produto cadastrado")).toBeVisible();
  await expect(page.getByText("Cadeira pessoal usada e revisada")).toHaveCount(0);
});
