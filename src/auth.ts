const TOKEN_KEY = 'ttw_admin_token';
const ADMIN_KEY = 'ttw_admin_user';

export type AdminUser = {
  id?: number;
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  role?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
};

export const ADMIN_PERMISSION_KOOK_MANAGE = 'kook:manage';

export function hasAdminPermission(admin: AdminUser | null, permission: string) {
  return Boolean(admin?.isSuperAdmin || admin?.username === 'admin' || admin?.permissions?.includes(permission));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSession(token: string, admin?: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function getAdmin(): AdminUser | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}
