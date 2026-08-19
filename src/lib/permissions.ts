export const PERMISSIONS = {
  USERS_MANAGE: "users.manage",
  ROUTINES_MANAGE_ALL: "routines.manage_all",
  ADS_MANAGE: "ads.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.USERS_MANAGE]: "Gestionar usuarios y admins",
  [PERMISSIONS.ROUTINES_MANAGE_ALL]: "Ver y editar rutinas de todos",
  [PERMISSIONS.ADS_MANAGE]: "Configurar publicidad en descanso",
  [PERMISSIONS.SETTINGS_MANAGE]: "Ajustes de la app",
};

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export function hasPermission(
  role: UserRole | undefined,
  permissions: string[] | undefined,
  required: Permission,
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (role !== "ADMIN") return false;
  return Boolean(permissions?.includes(required));
}

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export const SUPER_ADMIN_EMAIL = "aleclucena@gmail.com";
