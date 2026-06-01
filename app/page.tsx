import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { createAdmin } from "@/lib/supabase/server";

// ── Dashboard registry ──────────────────────────────────────────────────────
const DASHBOARDS = [
  {
    key:    "platform-research",
    title:  "Platform Research",
    desc:   "Interactive survey heatmap, field map and team roster for the platform impact study. 25 teams · 6 zones · sprint outreach queue.",
    href:   "/platform-dashboard/part2",
    status: "dev" as const,
    meta:   "Survey · Field map · Roster",
    color:  "red" as const,
    icon:   "grid",
  },
  {
    key:    "impact-intelligence",
    title:  "Impact Intelligence",
    desc:   "Platform team metrics — 25 teams, 6 zones. Tracks data collection progress for OKR 03: Quantified SKELAR Platform.",
    href:   "/platform-dashboard/part1",
    status: "dev" as const,
    meta:   "Етап 1 — Збір метрик · 12 зустрічей з 25",
    color:  "red" as const,
    icon:   "grid",
  },
  {
    key:    "reputation",
    title:  "Reputation Intelligence",
    desc:   "Brand monitoring, review scores and sentiment across all SKELAR products.",
    href:   "https://reputation-dashboard.vercel.app",
    status: "live" as const,
    meta:   "12 brands · updated weekly",
    color:  "red" as const,
    icon:   "star",
  },
  {
    key:    "talent-acquisition",
    title:  "Talent Acquisition",
    desc:   "New hire suggestions, candidate scoring and onboarding pipeline tracking.",
    href:   "/talent-acquisition",
    status: "dev" as const,
    meta:   "Q2 2026",
    color:  "purple" as const,
    icon:   "person",
  },
  {
    key:    "performance-review",
    title:  "Performance Review",
    desc:   "Structured employee reviews by cycle. Self-assessment, manager feedback, and calibration in one place.",
    href:   "/performance-review",
    status: "dev" as const,
    meta:   "Q2 2026",
    color:  "blue" as const,
    icon:   "grid",
  },
  {
    key:    "events",
    title:  "Corporate Events",
    desc:   "Company-wide events, team offsites, workshops and celebrations. RSVP and add to your calendar.",
    href:   "/events",
    status: "live" as const,
    meta:   "All team members",
    color:  "red" as const,
    icon:   "calendar",
  },
  {
    key:    "master",
    title:  "Master Dashboard",
    desc:   "Unified view across all platform teams — performance, velocity and health.",
    href:   "/master",
    status: "dev" as const,
    meta:   "Q3 2026",
    color:  "blue" as const,
    icon:   "grid",
  },
  {
    key:    "placeholder-1",
    title:  "Coming soon",
    desc:   "New dashboard module. Access will be assigned by administrators.",
    href:   null,
    status: "planned" as const,
    meta:   "",
    color:  "gray" as const,
    icon:   "lines",
  },
] as const;

type DashColor  = "red" | "purple" | "blue" | "gray";
type DashStatus = "live" | "dev" | "planned";
type DashIcon   = "star" | "person" | "grid" | "lines" | "calendar";

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// "events" is accessible to all authenticated users
const PUBLIC_DASHBOARDS = new Set(["events"]);

function hasAccess(profile: { dashboards?: string[] | null }, key: string) {
  if (PUBLIC_DASHBOARDS.has(key)) return true;
  if (!profile.dashboards) return false;
  return profile.dashboards.includes(key);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DashIconSvg({ name, color }: { name: DashIcon; color: DashColor }) {
  const fills: Record<DashColor, string> = {
    red:    "#DC2626",
    purple: "#7C3AED",
    blue:   "#2563EB",
    gray:   "#ccc",
  };
  const c = fills[color];

  if (name === "star") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L9.8 6H14.5L10.5 8.8L12 13.5L8 10.8L4 13.5L5.5 8.8L1.5 6H6.2L8 1.5Z" fill={c}/>
    </svg>
  );
  if (name === "person") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" fill={c}/>
      <path d="M2.5 13.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (name === "grid") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill={c}/>
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" fill={c} opacity="0.5"/>
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" fill={c} opacity="0.5"/>
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" fill={c}/>
    </svg>
  );
  if (name === "calendar") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <path d="M1.5 6.5h13" stroke={c} strokeWidth="1.4"/>
      <path d="M5 1.5v3M11 1.5v3" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="5.5" cy="9.5" r="1" fill={c}/>
      <circle cx="8" cy="9.5" r="1" fill={c}/>
      <circle cx="10.5" cy="9.5" r="1" fill={c}/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="7"  width="12" height="1.5" rx="0.75" fill={c}/>
      <rect x="2" y="4"  width="8"  height="1.5" rx="0.75" fill={c}/>
      <rect x="2" y="10" width="6"  height="1.5" rx="0.75" fill={c}/>
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function DashCard({
  dash,
  accessible,
}: {
  dash: (typeof DASHBOARDS)[number];
  accessible: boolean;
}) {
  const stripeColor: Record<DashColor, string> = {
    red:    "#DC2626",
    purple: "#7C3AED",
    blue:   "#2563EB",
    gray:   "#d1d5db",
  };
  const iconBg: Record<DashColor, string> = {
    red:    "#fef2f2",
    purple: "#f5f3ff",
    blue:   "#eff6ff",
    gray:   "#f5f4f0",
  };
  const badgeStyle: Record<DashStatus, { bg: string; color: string; label: string }> = {
    live:    { bg: "#f0fdf4", color: "#16a34a", label: "● Live" },
    dev:     { bg: "#fefce8", color: "#ca8a04", label: "◐ In development" },
    planned: { bg: "#f5f4f0", color: "#aaa",    label: "Planned" },
  };
  const badge  = badgeStyle[dash.status];
  const locked = !accessible || dash.status === "planned";

  const cardStyle: React.CSSProperties = {
    position:       "relative",
    display:        "flex",
    flexDirection:  "column",
    background:     "#fff",
    border:         "1px solid #e8e6e0",
    borderRadius:   10,
    overflow:       "hidden",
    textDecoration: "none",
    color:          "inherit",
    opacity:        locked ? 0.55 : 1,
    cursor:         locked ? "default" : "pointer",
    transition:     "box-shadow 0.15s, border-color 0.15s, transform 0.15s",
  };

  const inner = (
    <>
      <div style={{ height: 3, background: stripeColor[dash.color] }} />

      {locked && (
        <div style={{ position: "absolute", top: 14, right: 14, color: "#ccc" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5.5" width="8" height="6" rx="1.5" fill="#ccc"/>
            <path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px 14px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg[dash.color], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <DashIconSvg name={dash.icon as DashIcon} color={accessible ? dash.color : "gray"} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", padding: "2px 7px", borderRadius: 4, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
            {badge.label}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: locked ? "#bbb" : "#1a1a1a", marginBottom: 4 }}>
            {dash.title}
          </div>
          <div style={{ fontSize: 11.5, color: "#888", lineHeight: 1.5 }}>
            {accessible
              ? dash.desc
              : "You don't have access to this dashboard. Contact your administrator."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f0ede8", marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: "#bbb" }}>{dash.meta}</span>
          {accessible && (dash.status as string) !== "planned" ? (
            <span style={{ fontSize: 13, color: "#ccc" }}>→</span>
          ) : (
            <button style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", border: "1px solid #e0ddd6", borderRadius: 6, background: "#fff", fontSize: 11, fontWeight: 500, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Request access
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (accessible && dash.href && (dash.status as string) !== "planned") {
    const isExternal = dash.href.startsWith("http");
    if (isExternal) {
      return <a href={dash.href} target="_blank" rel="noopener noreferrer" style={cardStyle}>{inner}</a>;
    }
    return <Link href={dash.href} style={cardStyle}>{inner}</Link>;
  }
  return <div style={cardStyle}>{inner}</div>;
}

// ── Page (Server Component) ───────────────────────────────────────────────────
export default async function HubPage() {
  // Використовуємо createClient з lib/supabase/server —
  // той самий клієнт що і в proxy.ts, cookies читаються однаково
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use service role to reliably read profile (bypasses any RLS edge cases)
  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, status, dashboards, is_blocked")
    .eq("id", user.id)
    .single();

  // Guard: blocked → /auth/blocked, pending/unapproved → /auth/pending
  if (profile?.is_blocked) redirect("/auth/blocked");
  if (!profile) {
    // No profile row — create pending so admin can approve
    const { error: insertErr } = await admin.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
      role: "user",
      status: "pending",
      dashboards: [],
      brands: [],
      is_blocked: false,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (insertErr) {
      console.error("[hub] failed to create pending profile:", insertErr.message, insertErr.details, insertErr.hint);
    }
    redirect("/auth/pending");
  }
  if (profile.status === "pending") redirect("/auth/pending");

  const name       = profile.full_name ?? user.email ?? "User";
  const role       = profile.role ?? "user";
  const email      = user.email ?? "";
  const isAdmin    = role === "admin" || role === "manager";
  const userDashes = (profile.dashboards ?? []) as string[];
  const ini        = initials(name);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif", color: "#1a1a1a" }}>

      {/* ── Topbar ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 48, background: "#fff", borderBottom: "1px solid #e8e6e0", position: "sticky", top: 0, zIndex: 100 }}>

        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/skelar-mark.png" alt="SKELAR" width={22} height={22} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>SKELAR</span>
          </div>
          <div style={{ width: 1, height: 16, background: "#e0ddd6" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", letterSpacing: "0.08em", textTransform: "uppercase" }}>Vault</span>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && (
            // Використовуємо <a> а не <Link> щоб уникнути prefetch без cookies
            <a
              href="/admin"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e0ddd6", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 500, color: "#666", textDecoration: "none" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M9.5 2.5l-.7.7M3.2 8.8l-.7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Admin
            </a>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", border: "1px solid #e8e6e0", borderRadius: 20 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
              {ini}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{name}</span>
            {isAdmin && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", padding: "2px 6px", background: "#fef2f2", borderRadius: 4, letterSpacing: "0.04em" }}>
                {role.toUpperCase()}
              </span>
            )}
          </div>

          <a
            href="/auth/logout"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e8e6e0", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 500, color: "#666", textDecoration: "none" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2H2.5A1 1 0 0 0 1.5 3v6a1 1 0 0 0 1 1h2M8 8.5l2.5-2.5L8 3.5M10.5 6H4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Log out
          </a>
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* User card */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "16px 20px", background: "#fff", border: "1px solid #e8e6e0", borderRadius: 10, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {ini}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{name}</div>
              <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>{email} · {role.charAt(0).toUpperCase() + role.slice(1)}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500, marginRight: 2 }}>Access:</span>
            {DASHBOARDS.filter(d => d.href).map((d) => {
              const active = userDashes.includes(d.key);
              return (
                <span key={d.key} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid", background: active ? "#fef2f2" : "#fafaf9", borderColor: active ? "#fca5a5" : "#e8e6e0", color: active ? "#DC2626" : "#bbb" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                  {d.title.split(" ")[0]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Dashboards */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Dashboards
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {DASHBOARDS.map((dash) => (
            <DashCard
              key={dash.key}
              dash={dash}
              accessible={hasAccess({ dashboards: userDashes }, dash.key)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
