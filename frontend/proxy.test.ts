import { describe, expect, it, vi, beforeEach } from "vitest";

const { nextMock, redirectMock } = vi.hoisted(() => ({
  nextMock: vi.fn(() => "NEXT_RESPONSE"),
  redirectMock: vi.fn((url: URL) => `REDIRECT:${url.toString()}`),
}));

vi.mock("next/server", () => ({
  NextResponse: { next: nextMock, redirect: redirectMock },
}));
vi.mock("@/auth", () => ({
  auth: (handler: (request: unknown) => unknown) => handler,
}));

// The mocked `auth` above unwraps `proxy` to a plain single-arg handler, but its static
// type still comes from next-auth's real (request, event) middleware signature.
type MockProxy = (request: { auth: unknown; url: string }) => unknown;

describe("proxy.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("passes the request through when signed in", async () => {
    const { proxy } = (await import("@/proxy")) as unknown as { proxy: MockProxy };

    const result = proxy({ auth: { user: { name: "A" } }, url: "http://localhost/dashboard" });

    expect(nextMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBe("NEXT_RESPONSE");
  });

  it("redirects to /login when signed out", async () => {
    const { proxy } = (await import("@/proxy")) as unknown as { proxy: MockProxy };

    const result = proxy({ auth: null, url: "http://localhost/dashboard" });

    expect(redirectMock).toHaveBeenCalledWith(new URL("/login", "http://localhost/dashboard"));
    expect(nextMock).not.toHaveBeenCalled();
    expect(result).toBe("REDIRECT:http://localhost/login");
  });

  it("passes the request through when NEXT_PUBLIC_SKIP_AUTH is true, even signed out", async () => {
    vi.stubEnv("NEXT_PUBLIC_SKIP_AUTH", "true");
    vi.resetModules();
    const { proxy } = (await import("@/proxy")) as unknown as { proxy: MockProxy };

    const result = proxy({ auth: null, url: "http://localhost/dashboard" });

    expect(nextMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBe("NEXT_RESPONSE");
  });
});
