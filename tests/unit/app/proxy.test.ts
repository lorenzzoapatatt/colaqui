// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";
import { AUTH_SESSION_COOKIE } from "@/modules/auth/domain/session";

describe("authentication proxy", () => {
  it("redirects an application page without a session cookie", () => {
    const response = proxy(new NextRequest("http://localhost:3000/products"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fproducts",
    );
  });

  it("returns a ProblemDetails response for protected APIs without a cookie", async () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/api/products"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      type: "about:blank",
      status: 401,
      title: "Autenticação necessária",
    });
  });

  it("allows public routes and optimistically allows a request with a cookie", () => {
    const publicResponse = proxy(
      new NextRequest("http://localhost:3000/api/health"),
    );
    const authenticatedRequest = new NextRequest(
      "http://localhost:3000/products",
    );
    authenticatedRequest.cookies.set(AUTH_SESSION_COOKIE, "raw-token");
    const authenticatedResponse = proxy(authenticatedRequest);

    expect(publicResponse.headers.get("x-middleware-next")).toBe("1");
    expect(authenticatedResponse.headers.get("x-middleware-next")).toBe("1");
  });
});
