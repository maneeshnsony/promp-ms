import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: authMock }));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("lib/api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: "success", data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    authMock.mockReset();
    authMock.mockResolvedValue(null);
    vi.stubEnv("API_BASE_URL", "http://api.internal/v1");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.public/v1");
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalWindow === undefined) {
      // @ts-expect-error restoring server-like state used mid-test
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
    vi.unstubAllGlobals();
  });

  function goServer() {
    // @ts-expect-error simulate a server (no window) execution context
    delete globalThis.window;
  }

  describe("apiFetch", () => {
    it("uses API_BASE_URL on the server (window undefined)", async () => {
      const { apiFetch } = await import("@/lib/api");
      goServer();

      await apiFetch("/prompts");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://api.internal/v1/prompts",
        expect.any(Object)
      );
    });

    it("uses NEXT_PUBLIC_API_BASE_URL on the client (window defined)", async () => {
      const { apiFetch } = await import("@/lib/api");

      await apiFetch("/prompts");

      expect(fetchMock).toHaveBeenCalledWith("http://api.public/v1/prompts", expect.any(Object));
    });

    it("attaches the bearer token on the server when a session exists", async () => {
      const { apiFetch } = await import("@/lib/api");
      goServer();
      authMock.mockResolvedValue({ backendToken: "tok123" });

      await apiFetch("/prompts");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer tok123");
    });

    it("omits the bearer token on the server when there is no session", async () => {
      const { apiFetch } = await import("@/lib/api");
      goServer();
      authMock.mockResolvedValue(null);

      await apiFetch("/prompts");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
    });

    it("never calls auth() on the client, even with an active session server-side", async () => {
      const { apiFetch } = await import("@/lib/api");

      await apiFetch("/prompts");

      expect(authMock).not.toHaveBeenCalled();
      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
    });

    it("always sets Content-Type and preserves caller-supplied headers", async () => {
      const { apiFetch } = await import("@/lib/api");

      await apiFetch("/prompts", { headers: { "X-Custom": "yes" } });

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("X-Custom")).toBe("yes");
    });

    describe("when NEXT_PUBLIC_SKIP_AUTH is true", () => {
      beforeEach(() => {
        vi.stubEnv("NEXT_PUBLIC_SKIP_AUTH", "true");
        vi.resetModules();
      });

      it("never calls auth(), even on the server with a session available", async () => {
        const { apiFetch } = await import("@/lib/api");
        goServer();
        authMock.mockResolvedValue({ backendToken: "tok123" });

        await apiFetch("/prompts");

        expect(authMock).not.toHaveBeenCalled();
        const headers = fetchMock.mock.calls[0][1].headers as Headers;
        expect(headers.get("Authorization")).toBeNull();
      });
    });
  });

  describe("unwrap (via createPrompt)", () => {
    it("resolves with body.data on a success envelope", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: { id: 1, title: "Hi" } })
      );

      const result = await createPrompt({ title: "Hi", description: "desc" });

      expect(result).toEqual({ id: 1, title: "Hi" });
    });

    it("throws the envelope message when the response is not ok", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "error", message: "Custom message" }, false, 422)
      );

      await expect(createPrompt({ title: "", description: "" })).rejects.toThrow(
        "Custom message"
      );
    });

    it("falls back to joined validation messages when there is no envelope message", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse(
          { status: 422, messages: { title: "required", description: "too short" } },
          false,
          422
        )
      );

      await expect(createPrompt({ title: "", description: "" })).rejects.toThrow(
        "required, too short"
      );
    });

    it("falls back to a generic status message when the body is unparseable", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error("bad json")),
      });

      await expect(createPrompt({ title: "", description: "" })).rejects.toThrow(
        "Request failed with status 500"
      );
    });

    it("throws when res.ok is true but the envelope status is error", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "error", message: "Still an error" }, true, 200)
      );

      await expect(createPrompt({ title: "", description: "" })).rejects.toThrow(
        "Still an error"
      );
    });
  });

  describe("getPrompts", () => {
    it("builds a query string, omitting undefined and empty values", async () => {
      const { getPrompts } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ data: [], meta: { page: 1, per_page: 20, total: 0 } })
      );

      await getPrompts({ search: "foo", category: undefined, page: 2, pinned: false });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("search=foo");
      expect(url).toContain("page=2");
      expect(url).toContain("pinned=false");
      expect(url).not.toContain("category=");
    });

    it("passes cache: no-store", async () => {
      const { getPrompts } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ data: [], meta: { page: 1, per_page: 20, total: 0 } })
      );

      await getPrompts();

      expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    });

    it("throws its own plain message on a non-ok response (not via unwrap)", async () => {
      const { getPrompts } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({ status: "error", message: "ignored" }, false, 503));

      await expect(getPrompts()).rejects.toThrow("Failed to load prompts (503)");
    });
  });

  describe("GET-list functions", () => {
    it("getCategories fetches /categories and unwraps the result", async () => {
      const { getCategories } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: [{ id: 1, name: "Cat", slug: "cat" }] })
      );

      const result = await getCategories();

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/categories");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
      expect(result).toEqual([{ id: 1, name: "Cat", slug: "cat" }]);
    });

    it("getTags fetches /tags and unwraps the result", async () => {
      const { getTags } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: [{ id: 1, name: "Tag", slug: "tag" }] })
      );

      const result = await getTags();

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/tags");
      expect(result).toEqual([{ id: 1, name: "Tag", slug: "tag" }]);
    });

    it("getRoles fetches /roles and unwraps the result", async () => {
      const { getRoles } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: [{ id: 1, name: "Role", slug: "role" }] })
      );

      const result = await getRoles();

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/roles");
      expect(result).toEqual([{ id: 1, name: "Role", slug: "role" }]);
    });

    it("getPromptVersions fetches /prompts/:id/versions and unwraps the result", async () => {
      const { getPromptVersions } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({
          status: "success",
          data: [{ id: 1, title: "T", description: "D", edited_at: "2026-01-01T00:00:00Z" }],
        })
      );

      const result = await getPromptVersions(5);

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/prompts/5/versions");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
      expect(result).toEqual([
        { id: 1, title: "T", description: "D", edited_at: "2026-01-01T00:00:00Z" },
      ]);
    });

    it("getTags throws the unwrapped error message on failure", async () => {
      const { getTags } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({ status: "error", message: "Tags unavailable." }, false, 500));

      await expect(getTags()).rejects.toThrow("Tags unavailable.");
    });
  });

  describe("prompt CRUD", () => {
    it("createPrompt posts to /prompts", async () => {
      const { createPrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({ status: "success", data: { id: 1 } }));

      await createPrompt({ title: "T", description: "D" });

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/prompts");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: "POST",
        body: JSON.stringify({ title: "T", description: "D" }),
      });
    });

    it("updatePrompt puts to /prompts/:id", async () => {
      const { updatePrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({ status: "success", data: { id: 5 } }));

      await updatePrompt(5, { title: "New" });

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/prompts/5");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    });

    it("deletePrompt deletes and throws on failure", async () => {
      const { deletePrompt } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({}, false, 404));

      await expect(deletePrompt(5)).rejects.toThrow("Failed to delete prompt (404)");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    });
  });

  describe("entity CRUD factory", () => {
    it("createCategory posts to /categories and unwraps the result", async () => {
      const { createCategory } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: { id: 1, name: "Cat", slug: "cat" } })
      );

      const result = await createCategory({ name: "Cat", slug: "cat" });

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/categories");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
      expect(result).toEqual({ id: 1, name: "Cat", slug: "cat" });
    });

    it("updateCategory puts to /categories/:id", async () => {
      const { updateCategory } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({ status: "success", data: { id: 2 } }));

      await updateCategory(2, { name: "Renamed" });

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/categories/2");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    });

    it("deleteCategory deletes and throws a plain message on failure", async () => {
      const { deleteCategory } = await import("@/lib/api");
      fetchMock.mockResolvedValue(jsonResponse({}, false, 409));

      await expect(deleteCategory(2)).rejects.toThrow("Failed to delete (409)");
    });

    it("createTag posts to /tags", async () => {
      const { createTag } = await import("@/lib/api");
      fetchMock.mockResolvedValue(
        jsonResponse({ status: "success", data: { id: 3, name: "Tag", slug: "tag" } })
      );

      await createTag({ name: "Tag", slug: "tag" });

      expect(fetchMock.mock.calls[0][0]).toBe("http://api.public/v1/tags");
    });
  });
});
