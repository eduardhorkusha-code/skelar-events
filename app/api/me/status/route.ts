import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[me/status] getUser error:", authError.message);
      return NextResponse.json({ status: "unauthenticated", error: authError.message });
    }

    if (!user) {
      return NextResponse.json({ status: "unauthenticated" });
    }

    const admin = createAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("status, is_blocked")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[me/status] profile fetch error:", profileError.message);
      return NextResponse.json({ status: "error", error: profileError.message }, { status: 500 });
    }

    if (!profile) return NextResponse.json({ status: "pending" });
    if (profile.is_blocked) return NextResponse.json({ status: "blocked" });
    return NextResponse.json({ status: profile.status ?? "pending" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[me/status] unexpected error:", msg);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
