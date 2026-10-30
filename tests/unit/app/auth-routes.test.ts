// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/modules/auth/domain/auth-errors";

const authMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  loginOwner: vi.fn(),
  logoutOwner: vi.fn(),
  setupOwner: vi.fn(),
}));

vi.mock("@/modules/auth/application/change-password", () => ({
  changePassword: authMocks.changePassword,
}));
vi.mock("@/modules/auth/application/login-owner", () => ({
  loginOwner: authMocks.loginOwner,
}));
vi.mock("@/modules/auth/application/logout-owner", () => ({
  logoutOwner: authMocks.logoutOwner,
}));
vi.mock("@/modules/auth/application/setup-owner", () => ({
  setupOwner: authMocks.setupOwner,
}));

import { POST as changePasswordPost } from "@/app/api/auth/change-password/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as setupPost } from "@/app/api/auth/setup/route";

function jsonRequest(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("authentication Route Handlers", () => {
  beforeEach(() => {
    authMocks.changePassword.mockReset();
    authMocks.loginOwner.mockReset();
    authMocks.logoutOwner.mockReset();
    authMocks.setupOwner.mockReset();
  });

  it("creates the first owner and maps an already-configured conflict", async () => {
    authMocks.setupOwner.mockResolvedValueOnce({
      id: "owner-id",
      email: "dono@example.com",
      createdAt: new Date("2026-10-29T12:00:00.000Z"),
    });
    const created = await setupPost(
      jsonRequest("/api/auth/setup", {
        email: "dono@example.com",
        password: "uma-senha-segura-123",
      }),
    );

    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      email: "dono@example.com",
    });

    authMocks.setupOwner.mockRejectedValueOnce(
      new AuthError(
        409,
        "Proprietário já configurado",
        "O proprietário deste Colaqui já foi configurado.",
        "OWNER_ALREADY_CONFIGURED",
      ),
    );
    const conflict = await setupPost(
      jsonRequest("/api/auth/setup", {
        email: "dono@example.com",
        password: "uma-senha-segura-123",
      }),
    );

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      type: "about:blank",
      status: 409,
      title: "Proprietário já configurado",
    });
  });

  it("sets the hardened session cookie after login", async () => {
    authMocks.loginOwner.mockResolvedValueOnce({
      rawToken: "raw-session-token",
      expiresAt: new Date("2026-11-28T12:00:00.000Z"),
      owner: {
        id: "owner-id",
        email: "dono@example.com",
        createdAt: new Date("2026-10-29T12:00:00.000Z"),
      },
    });
    const request = jsonRequest("/api/auth/login", {
      email: "dono@example.com",
      password: "uma-senha-segura-123",
    });
    request.headers.set("x-forwarded-for", "192.0.2.30");

    const response = await loginPost(request);
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(authMocks.loginOwner).toHaveBeenCalledWith(
      expect.anything(),
      { ipAddress: "192.0.2.30" },
    );
    expect(setCookie).toContain("colaqui_session=raw-session-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
  });

  it("returns stable credential errors and validates malformed bodies", async () => {
    authMocks.loginOwner.mockRejectedValueOnce(
      new AuthError(
        401,
        "Não foi possível entrar",
        "E-mail ou senha inválidos.",
        "INVALID_CREDENTIALS",
      ),
    );
    const invalidCredentials = await loginPost(
      jsonRequest("/api/auth/login", {
        email: "desconhecido@example.com",
        password: "senha-incorreta",
      }),
    );
    const malformed = await loginPost(
      jsonRequest("/api/auth/login", { email: "sem-senha@example.com" }),
    );

    expect(invalidCredentials.status).toBe(401);
    await expect(invalidCredentials.json()).resolves.toMatchObject({
      detail: "E-mail ou senha inválidos.",
    });
    expect(malformed.status).toBe(400);
  });

  it("revokes the server session and expires the cookie on logout and password change", async () => {
    authMocks.logoutOwner.mockResolvedValueOnce(undefined);
    authMocks.changePassword.mockResolvedValueOnce(undefined);
    const cookie = "colaqui_session=raw-session-token";

    const logoutResponse = await logoutPost(
      jsonRequest("/api/auth/logout", {}, cookie),
    );
    const changeResponse = await changePasswordPost(
      jsonRequest(
        "/api/auth/change-password",
        {
          currentPassword: "uma-senha-segura-123",
          newPassword: "outra-senha-segura-456",
        },
        cookie,
      ),
    );

    expect(logoutResponse.status).toBe(204);
    expect(changeResponse.status).toBe(204);
    expect(authMocks.logoutOwner).toHaveBeenCalledWith("raw-session-token");
    expect(authMocks.changePassword).toHaveBeenCalledWith({
      rawToken: "raw-session-token",
      currentPassword: "uma-senha-segura-123",
      newPassword: "outra-senha-segura-456",
    });
    expect(logoutResponse.headers.get("set-cookie")).toContain(
      "colaqui_session=",
    );
    expect(changeResponse.headers.get("set-cookie")).toContain(
      "colaqui_session=",
    );
  });
});
