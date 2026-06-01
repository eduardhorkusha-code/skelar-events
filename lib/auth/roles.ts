/**
 * apps/hub/lib/auth/roles.ts
 * Product-scoped role checks for skelar-vault hub.
 */

import { createClient } from "@supabase/supabase-js";

export type RoleScope =
  | "global"
  | "hub_events"
  | "hub_ta"
  | "hub_calendar"
  | "hub_perf_review"
  | "reputation";

export type RoleLevel = "admin" | "editor" | "viewer";

const SCOPE_OWNERS: Record<string, RoleScope[]> = {
  hub_events:      ["global", "hub_events"],
  hub_ta:          ["global", "hub_ta"],
  hub_calendar:    ["global", "hub_calendar"],
  hub_perf_review: ["global", "hub_perf_review"],
  reputation:      ["global", "reputation"],
  global:          ["global"],
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function hasRole(
  userId: string,
  scope: RoleScope,
  minRole: RoleLevel = "viewer"
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("scope, role")
    .eq("user_id", userId)
    .in("scope", ["global", scope]);

  if (!error && data && data.length > 0) {
    const RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };
    const minRank = RANK[minRole] ?? 1;
    return data.some(r => (RANK[r.role] ?? 0) >= minRank);
  }

  // Fallback to legacy profiles.role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") return true;
  if (minRole === "editor" && profile?.role === "manager") return true;
  if (minRole === "viewer" && profile?.role) return true;
  return false;
}

export async function isAdmin(userId: string, scope: RoleScope): Promise<boolean> {
  return hasRole(userId, scope, "admin");
}

export async function canGrant(callerId: string, targetScope: RoleScope): Promise<boolean> {
  const allowedScopes = SCOPE_OWNERS[targetScope] ?? [];
  for (const s of allowedScopes) {
    if (await isAdmin(callerId, s as RoleScope)) return true;
  }
  return false;
}

export async function grantRole(
  callerId: string,
  targetUserId: string,
  scope: RoleScope,
  role: RoleLevel
): Promise<string | null> {
  if (!(await canGrant(callerId, scope))) {
    return `Caller lacks admin on scope '${scope}'`;
  }
  const supabase = getServiceClient();
  const { error } = await supabase.from("user_roles").upsert(
    { user_id: targetUserId, scope, role, granted_by: callerId },
    { onConflict: "user_id,scope" }
  );
  return error ? error.message : null;
}

export async function revokeRole(
  callerId: string,
  targetUserId: string,
  scope: RoleScope
): Promise<string | null> {
  if (!(await canGrant(callerId, scope))) {
    return `Caller lacks admin on scope '${scope}'`;
  }
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", targetUserId)
    .eq("scope", scope);
  return error ? error.message : null;
}

export async function getUserRoles(
  userId: string
): Promise<Array<{ scope: RoleScope; role: RoleLevel; granted_at: string }>> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("user_roles")
    .select("scope, role, granted_at")
    .eq("user_id", userId);
  return (data ?? []) as Array<{ scope: RoleScope; role: RoleLevel; granted_at: string }>;
}
