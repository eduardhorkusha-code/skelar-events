"use client";

import { useState } from "react";

export default function PendingPage() {
  const [checking, setChecking] = useState(false);

  function handleCheck() {
    setChecking(true);
    // Full browser navigation to /. Hub page will check DB status:
    // - approved → renders hub
    // - still pending → redirects back here (page reloads, user sees same page)
    window.location.href = "/";
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f4f0",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#fff",
        border: "1px solid #e8e6e0",
        borderRadius: 14,
        padding: "40px 36px",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
      }}>
        {/* Clock icon */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "#fefce8", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="#ca8a04" strokeWidth="1.5"/>
            <path d="M11 6.5v5l3 2" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a", marginBottom: 10 }}>
          Access pending approval
        </div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
          Your account has been registered. An administrator will review and
          grant access shortly. You&apos;ll be able to log in once your account
          is approved.
        </div>

        <div style={{
          background: "#fefce8",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 28,
          fontSize: 12,
          color: "#92400e",
          lineHeight: 1.5,
          textAlign: "left",
        }}>
          <strong>What happens next?</strong><br/>
          Contact your team lead or IT admin at{" "}
          <a href="mailto:it@skelar.tech" style={{ color: "#92400e" }}>it@skelar.tech</a>{" "}
          to speed up approval.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleCheck}
            disabled={checking}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 20px",
              background: checking ? "#86efac" : "#16a34a", borderRadius: 7,
              fontSize: 13, fontWeight: 600, color: "#fff",
              border: "none", cursor: checking ? "default" : "pointer",
              width: "100%",
            }}
          >
            {checking ? "Checking…" : "Check my access →"}
          </button>

          <a href="/auth/logout" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 20px",
            border: "1px solid #e0ddd6", borderRadius: 7,
            fontSize: 13, fontWeight: 500, color: "#666",
            textDecoration: "none",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2H2.5A1 1 0 0 0 1.5 3v6a1 1 0 0 0 1 1h2M8 8.5l2.5-2.5L8 3.5M10.5 6H4.5"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
