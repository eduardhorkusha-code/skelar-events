import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Product-scoped role helpers — unit tests ─────────────────────────────────
//
// lib/auth/roles.ts logic tested in isolation using mock Supabase client.
// No network calls are made; all Supabase interactions are stubbed.

// ── Mock @supabase/supabase-js ────────────────────────────────────────────────

type MockRow = { scope?: string; role?: string; granted_at?: string };

let mockUserRolesRows: MockRow[] = [];
let mockProfileRow: { role: string } | null = null;
let mockUpsertError: { message: string } | null = null;
let mockDeleteError: { message: string } | null = null;

function makeMockSupabase() {
  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => {
          if (table === "user_roles") {
            return {
              in: (_col2: string, vals: string[]) => {
                // Filter rows by the in() values to correctly simulate Supabase filtering
                const filtered = mockUserRolesRows.filter(
                  r => r.scope !== undefined && vals.includes(r.scope)
                );
                return Promise.resolve({ data: filtered, error: null });
              },
            };
          }
          // profiles
          return {
            single: () =>
              Promise.resolve({ data: mockProfileRow, error: null }),
          };
        },
      }),
      upsert: (_row: unknown, _opts?: unknown) =>
        Promise.resolve({ error: mockUpsertError }),
      delete: () => ({
        eq: (_c1: string, _v1: string) => ({
          eq: (_c2: string, _v2: string) =>
            Promise.resolve({ error: mockDeleteError }),
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
import { hasRole, isAdmin, canGrant, grantRole, revokeRole } from "../auth/roles";

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockUserRolesRows = [];
  mockProfileRow = null;
  mockUpsertError = null;
  mockDeleteError = null;
});

// ── hasRole ───────────────────────────────────────────────────────────────────

describe("hasRole — user_roles table", () => {
  it("returns true when user has exact scope with sufficient role", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "editor" }];
    expect(await hasRole("u1", "hub_events", "editor")).toBe(true);
  });

  it("returns true when user has global scope (overrides any product scope)", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    expect(await hasRole("u1", "hub_ta", "editor")).toBe(true);
  });

  it("returns false when user has viewer but minRole is editor", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "viewer" }];
    expect(await hasRole("u1", "hub_events", "editor")).toBe(false);
  });

  it("returns false when user has no matching scope", async () => {
    mockUserRolesRows = [{ scope: "hub_ta", role: "admin" }];
    expect(await hasRole("u1", "hub_events", "viewer")).toBe(false);
  });

  it("returns true when viewer role satisfies minRole=viewer", async () => {
    mockUserRolesRows = [{ scope: "hub_calendar", role: "viewer" }];
    expect(await hasRole("u1", "hub_calendar")).toBe(true);
  });
});

describe("hasRole — legacy profiles fallback (no user_roles rows)", () => {
  it("returns true for legacy admin on any scope", async () => {
    mockUserRolesRows = [];
    mockProfileRow = { role: "admin" };
    expect(await hasRole("u1", "hub_events", "admin")).toBe(true);
  });

  it("returns true for legacy manager when minRole=editor", async () => {
    mockUserRolesRows = [];
    mockProfileRow = { role: "manager" };
    expect(await hasRole("u1", "hub_events", "editor")).toBe(true);
  });

  it("returns false for legacy manager when minRole=admin", async () => {
    mockUserRolesRows = [];
    mockProfileRow = { role: "manager" };
    expect(await hasRole("u1", "hub_events", "admin")).toBe(false);
  });

  it("returns true for any role when minRole=viewer", async () => {
    mockUserRolesRows = [];
    mockProfileRow = { role: "user" };
    expect(await hasRole("u1", "hub_events", "viewer")).toBe(true);
  });

  it("returns false when no user_roles and profile is null", async () => {
    mockUserRolesRows = [];
    mockProfileRow = null;
    expect(await hasRole("u1", "hub_events")).toBe(false);
  });
});

// ── isAdmin ───────────────────────────────────────────────────────────────────

describe("isAdmin", () => {
  it("returns true when user has admin role on the scope", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "admin" }];
    expect(await isAdmin("u1", "hub_events")).toBe(true);
  });

  it("returns false when user has editor role (not admin)", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "editor" }];
    expect(await isAdmin("u1", "hub_events")).toBe(false);
  });
});

// ── canGrant ──────────────────────────────────────────────────────────────────

describe("canGrant", () => {
  it("returns true when caller is global admin", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    expect(await canGrant("caller", "hub_ta")).toBe(true);
  });

  it("returns true when caller is product admin on the exact scope", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "admin" }];
    expect(await canGrant("caller", "hub_events")).toBe(true);
  });

  it("returns false when caller has only viewer on the scope", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "viewer" }];
    expect(await canGrant("caller", "hub_events")).toBe(false);
  });

  it("returns false when caller has admin on a different scope", async () => {
    mockUserRolesRows = [{ scope: "hub_ta", role: "admin" }];
    expect(await canGrant("caller", "hub_events")).toBe(false);
  });
});

// ── grantRole ─────────────────────────────────────────────────────────────────

describe("grantRole", () => {
  it("returns null (success) when caller is global admin", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    mockUpsertError = null;
    const result = await grantRole("caller", "target", "hub_events", "editor");
    expect(result).toBeNull();
  });

  it("returns error message when caller lacks admin on scope", async () => {
    mockUserRolesRows = [{ scope: "hub_events", role: "viewer" }];
    const result = await grantRole("caller", "target", "hub_events", "editor");
    expect(result).toContain("hub_events");
  });

  it("returns Supabase error message on upsert failure", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    mockUpsertError = { message: "duplicate key value violates unique constraint" };
    const result = await grantRole("caller", "target", "hub_ta", "viewer");
    expect(result).toBe("duplicate key value violates unique constraint");
  });
});

// ── revokeRole ────────────────────────────────────────────────────────────────

describe("revokeRole", () => {
  it("returns null (success) when caller is global admin", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    mockDeleteError = null;
    const result = await revokeRole("caller", "target", "hub_events");
    expect(result).toBeNull();
  });

  it("returns error message when caller lacks admin", async () => {
    mockUserRolesRows = [];
    mockProfileRow = null;
    const result = await revokeRole("caller", "target", "hub_events");
    expect(result).toContain("hub_events");
  });

  it("returns Supabase error on delete failure", async () => {
    mockUserRolesRows = [{ scope: "global", role: "admin" }];
    mockDeleteError = { message: "row not found" };
    const result = await revokeRole("caller", "target", "hub_calendar");
    expect(result).toBe("row not found");
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
