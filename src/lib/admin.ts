const CLIENT_ADMIN_EMAILS = ["u.ncovering2026@gmail.com"];

function parseAdminEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const envAdminEmails = parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS);

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const adminEmails = envAdminEmails.length > 0 ? envAdminEmails : CLIENT_ADMIN_EMAILS;
  return adminEmails.includes(normalizedEmail);
}

export function getPostLoginPath(email: string | null | undefined, redirect: string): string {
  if (isAdminEmail(email)) return "/admin";
  return redirect === "/" ? "/start" : redirect;
}
