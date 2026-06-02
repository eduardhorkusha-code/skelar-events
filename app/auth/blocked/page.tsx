"use client";

import { useState } from "react";

// Email protected from scrapers — decoded client-side on click only
function RevealEmail() {
  const [shown,  setShown]  = useState(false);
  const [copied, setCopied] = useState(false);
  const addr = () => atob("bWlkYXMtc2VydmljZUBza2VsYXIudGVjaA==");

  async function copy() {
    await navigator.clipboard.writeText(addr());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!shown) {
    return (
      <button
        onClick={() => setShown(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 5,
          border: "1px solid #e0ddd6", background: "#fafaf9",
          color: "#666", fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        ✉ Show service contact
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
      <code style={{ fontSize: 12, color: "#1a1a1a", background: "#f5f4f0", padding: "3px 8px", borderRadius: 4, border: "1px solid #e0ddd6" }}>
        {addr()}
      </code>
      <button onClick={copy} style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 4,
        border: "1px solid #e0ddd6", background: copied ? "#f0fdf4" : "#fff",
        color: copied ? "#16a34a" : "#888", cursor: "pointer", fontFamily: "inherit",
      }}>
        {copied ? "✓ copied" : "copy"}
      </button>
    </span>
  );
}

export default function BlockedPage() {
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
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#fef2f2", margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="#DC2626" strokeWidth="1.5"/>
            <path d="M3.5 3.5l13 13" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>
          Access suspended
        </div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>
          Your account has been suspended by an administrator.
        </div>

        <div style={{
          background: "#fafaf9", border: "1px solid #e8e6e0",
          borderRadius: 8, padding: "12px 14px",
          marginBottom: 24, fontSize: 12, color: "#888", lineHeight: 1.7,
          textAlign: "left" as const,
        }}>
          If you believe this is a mistake, contact the service team:<br/>
          <span style={{ marginTop: 6, display: "inline-block" }}>
            <RevealEmail />
          </span>
        </div>

        <a href="/auth/logout" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 20px",
          border: "1px solid #e0ddd6", borderRadius: 7,
          fontSize: 13, fontWeight: 500, color: "#666",
          textDecoration: "none",
        }}>
          Sign out
        </a>
      </div>
    </div>
  );
}
