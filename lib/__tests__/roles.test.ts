import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Events-scoped role helpers — unit tests ──────────────────────────────────
//
// lib/auth/roles.ts logic tested in isolation using mock Supabase client.
// No network calls are made; all Supabase interactions are stubbed.
// New API: hasRole(userId, minRole?) — scope is fixed to ["global", "events"].

// ── Mock @supabase/supabase-js ────────────────────────────────────────────────

type MockRow = { scope?: string; role?: string; status?: string };

let mockUserRolesRows: MockRow[] = [];
let mockQueryError: { message: string } | null = null;

function makeMockSupabase() {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          in: (_col2: string, _vals: string[]) => ({
            eq: (_col3: string, _val3: string) =>
              Promise.resolve({ data: mockUserRolesRows, error: mockQueryError }),
          }),
        }),
      }),
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => makeMockSupabase(),
}));

// ── Set required env vars ─────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-key";

// ── Import after mock setup ───────────────────────────────────────────────────
import { hasRole, isAdmin, canEdit } from "../auth/roles";

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockUserRolesRows = [];
  mockQueryError = null;
});

// ── hasRole ───────────────────────────────────────────────────────────────────

describe("hasRole — user_roles table (scope fixed to events/global)", () => {
  it("returns true when user has editor role (satisfies editor minRole)", async () => {
    mockUserRolesRows = [{ scope: "events", role: "editor", status: "active" }];
    expect(await hasRole("u1", "editor")).toBe(true);
  });

  it("returns true when user has global admin role (satisfies any minRole)", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin", status: "active" }];
    expect(await hasRole("u1", "editor")).toBe(true);
  });

  it("returns false when user has viewer but minRole is editor", async () => {
    mockUserRolesRows = [{ scope: "events", role: "viewer", status: "active" }];
    expect(await hasRole("u1", "editor")).toBe(false);
  });

  it("returns false when data is empty", async () => {
    mockUserRolesRows = [];
    expect(await hasRole("u1", "viewer")).toBe(false);
  });

  it("returns true when viewer role satisfies default minRole (viewer)", async () => {
    mockUserRolesRows = [{ scope: "events", role: "viewer", status: "active" }];
    expect(await hasRole("u1")).toBe(true);
  });

  it("returns false on query error", async () => {
    mockQueryError = { message: "connection refused" };
    expect(await hasRole("u1", "admin")).toBe(false);
  });
});

// ── isAdmin ───────────────────────────────────────────────────────────────────

describe("isAdmin", () => {
  it("returns true when user has admin role", async () => {
    mockUserRolesRows = [{ scope: "events", role: "admin", status: "active" }];
    expect(await isAdmin("u1")).toBe(true);
  });

  it("returns false when user has editor role (not admin)", async () => {
    mockUserRolesRows = [{ scope: "events", role: "editor", status: "active" }];
    expect(await isAdmin("u1")).toBe(false);
  });

  it("returns false when user has no roles", async () => {
    mockUserRolesRows = [];
    expect(await isAdmin("u1")).toBe(false);
  });
});

// ── canEdit ───────────────────────────────────────────────────────────────────

describe("canEdit", () => {
  it("returns true when user has editor role", async () => {
    mockUserRolesRows = [{ scope: "events", role: "editor", status: "active" }];
    expect(await canEdit("u1")).toBe(true);
  });

  it("returns true when user has admin role (satisfies editor minRole)", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin", status: "active" }];
    expect(await canEdit("u1")).toBe(true);
  });

  it("returns false when user has only viewer role", async () => {
    mockUserRolesRows = [{ scope: "events", role: "viewer", status: "active" }];
    expect(await canEdit("u1")).toBe(false);
  });

  it("returns false when user has no roles", async () => {
    mockUserRolesRows = [];
    expect(await canEdit("u1")).toBe(false);
  });
});

// ── Role rank invariants ──────────────────────────────────────────────────────

describe("Role rank hierarchy invariants", () => {
  const RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

  it("admin rank > editor rank", () => {
    expect(RANK.admin).toBeGreaterThan(RANK.editor);
  });

  it("editor rank > viewer rank", () => {
    expect(RANK.editor).toBeGreaterThan(RANK.viewer);
  });

  it("admin satisfies admin minRole", () => {
    expect(RANK.admin >= RANK.admin).toBe(true);
  });

  it("editor does not satisfy admin minRole", () => {
    expect(RANK.editor >= RANK.admin).toBe(false);
  });

  it("viewer satisfies viewer minRole", () => {
    expect(RANK.viewer >= RANK.viewer).toBe(true);
  });
});
