import { HttpRequest } from '@azure/functions';

const isDev = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';

export function getCallerUsername(request: HttpRequest): string | null {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8')).userDetails ?? null;
  } catch {
    return null;
  }
}

export function isAdmin(request: HttpRequest): boolean {
  if (isDev) return true;
  const caller = getCallerUsername(request);
  if (!caller) return false;
  const admins = (process.env.VITE_INITIAL_ADMIN_USERNAMES ?? '').split(',').map((u) => u.trim().toLowerCase());
  return admins.includes(caller.toLowerCase());
}
