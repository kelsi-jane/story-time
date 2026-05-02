export interface AuthUser {
  username: string;
  userId: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  if (import.meta.env.DEV) {
    const username = import.meta.env.VITE_DEV_AUTH_USERNAME as string | undefined;
    if (!username) return null;
    return { username, userId: username };
  }
  try {
    const res = await fetch('/.auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    const principal = data?.clientPrincipal;
    if (!principal) return null;
    return { username: principal.userDetails as string, userId: principal.userId as string };
  } catch {
    return null;
  }
}
