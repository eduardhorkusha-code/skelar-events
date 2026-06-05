export function getAutoApproveDomains(): string[] {
  const raw = process.env.APPROVED_DOMAINS ?? "";
  return raw
    .split(",")
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isAutoApprovedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return getAutoApproveDomains().includes(domain);
}
