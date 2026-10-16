import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";

// api.ts refuses to load without a base URL; set it before the import runs.
vi.hoisted(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.test";
});

// The real store pulls in expo-secure-store; the client only needs the slug.
vi.mock("@/data/workspace-store", () => ({ getCurrentSlug: () => null }));
vi.mock("@/data/backend-config-store", () => ({
  getActiveServerId: () => "multica-default",
  getApiUrl: () => "https://api.example.test",
}));

describe("api.deleteComment", () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // #8296: servers that keep a deleted comment's replies also route
  // /keep-replies; older servers do not, so a keep-replies delete that reaches
  // one fails instead of deleting the replies too.
  it.each([
    [{ keepReplies: true }, "https://api.example.test/api/comments/comment-1/keep-replies"],
    [{ keepReplies: false }, "https://api.example.test/api/comments/comment-1"],
    [undefined, "https://api.example.test/api/comments/comment-1"],
  ])("with %j sends DELETE %s", async (opts, url) => {
    await api.deleteComment("comment-1", opts);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method: "DELETE" }));
  });
});

describe("API error messages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      code: "active_duplicate_issue",
      error: "An active issue with this title already exists",
    }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the server error field when the response has no message field", async () => {
    await expect(api.createIssue({ title: "Duplicate" })).rejects.toMatchObject({
      status: 409,
      message: "An active issue with this title already exists",
    });
  });
});

describe("mobile tool catalog and usage endpoints", () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates workspace Skills using the configured API origin", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([
      { id: "skill-1", workspace_id: "ws-1", name: "Review", description: "Review changes" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));

    const skills = await api.listSkills();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/skills",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(skills[0]?.name).toBe("Review");
  });

  it("validates workspace automations and preserves the envelope", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ autopilots: [], total: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(api.listAutopilots()).resolves.toEqual({ autopilots: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/autopilots",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("requests usage from the current server with the requested timezone and range", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await api.getDashboardUsageDaily({ days: 7, tz: "Asia/Shanghai" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/dashboard/usage/daily?days=7&tz=Asia%2FShanghai",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
