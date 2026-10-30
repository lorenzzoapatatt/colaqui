import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoginPage from "@/app/(auth)/login/page";
import SetupPage from "@/app/(auth)/setup/page";

describe("owner authentication pages", () => {
  it("renders an accessible first-owner setup form", () => {
    render(<SetupPage />);

    expect(
      screen.getByRole("heading", { name: "Configure seu Colaqui" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByRole("button", { name: "Criar acesso" })).toBeVisible();
  });

  it("renders an accessible login form without exposing account existence", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Entre no Colaqui" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible();
  });
});
