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
        maxWidth: 380,
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
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
          Your account has been suspended by an administrator. Please contact your team lead or IT support.
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