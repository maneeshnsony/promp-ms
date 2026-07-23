import { describe, expect, it, vi, beforeEach } from "vitest";

interface JwtCallbackArgs {
  token: Record<string, unknown>;
  account: { id_token?: string } | null;
}
interface CapturedConfig {
  callbacks: {
    jwt: (args: JwtCallbackArgs) => Promise<Record<string, unknown>>;
    session?: (...args: unknown[]) => unknown;
  };
}

const { captured } = vi.hoisted(() => ({
  captured: {} as { config?: CapturedConfig },
}));

vi.mock("next-auth", () => ({
  default: vi.fn((config: CapturedConfig) => {
    captured.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }),
}));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn(() => ({})) }));

describe("auth.ts", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_BASE_URL", "http://api.internal/v1");
    await import("@/auth");
  });

  describe("jwt callback", () => {
    it("exchanges the Google id_token for a backend token on success", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { token: "backend-jwt" } }),
      });

      const result = await captured.config!.callbacks.jwt({
        token: {},
        account: { id_token: "google-tok" },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://api.internal/v1/auth/google",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: "google-tok" }),
        })
      );
      expect(result).toEqual({ backendToken: "backend-jwt" });
    });

    it("leaves the token unchanged, without throwing, when the backend rejects the id_token", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: vi.fn(),
      });

      const result = await captured.config!.callbacks.jwt({
        token: { existing: "value" },
        account: { id_token: "google-tok" },
      });

      expect(result).toEqual({ existing: "value" });
    });

    it("never calls fetch when there is no account (token refresh, not a fresh sign-in)", async () => {
      const result = await captured.config!.callbacks.jwt({
        token: { existing: "value" },
        account: null,
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual({ existing: "value" });
    });
  });

  describe("session callback", () => {
    it("is not overridden, so the backend token is never copied onto the client-visible session object", () => {
      // No custom `session` callback here is deliberate: that callback's output is also
      // what NextAuth's own, unauthenticated GET /api/auth/session route returns to any
      // same-origin script, so putting the backend bearer token there would expose it to
      // any JS running on the page. Server-side code reads the token straight off the
      // encrypted `token` (JWT cookie) instead — see lib/api.ts's getBackendToken().
      expect(captured.config!.callbacks.session).toBeUndefined();
    });
  });
});
