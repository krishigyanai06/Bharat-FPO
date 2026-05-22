// Roles that exist in the system
export const ROLES = {
  FPO: 'fpo',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  VIEWER: 'viewer',
};

// Permission levels
export const PERMISSIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

// Role permissions - SuperAdmin is read-only, Admin/FPO have full access
export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: [PERMISSIONS.READ],
  [ROLES.VIEWER]: [PERMISSIONS.READ],
  [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
  [ROLES.FPO]: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
};

// Routes each role is allowed to access (undefined = all roles allowed)
export const ROUTE_ROLES = {
  '/dashboard': [ROLES.FPO, ROLES.ADMIN, ROLES.VIEWER, ROLES.SUPERADMIN],
  '/listing': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/procurement': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/inventory': [ROLES.FPO, ROLES.ADMIN, ROLES.VIEWER, ROLES.SUPERADMIN],
  '/buy': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/broadcast': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/members': [ROLES.FPO, ROLES.ADMIN, ROLES.VIEWER, ROLES.SUPERADMIN],
  '/documents': [ROLES.FPO, ROLES.ADMIN, ROLES.VIEWER, ROLES.SUPERADMIN],
  '/ledger': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/advertisement': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/reports': [ROLES.FPO, ROLES.ADMIN, ROLES.VIEWER],
  '/settings': [ROLES.FPO, ROLES.ADMIN, ROLES.SUPERADMIN],
  '/create-tenant': [ROLES.SUPERADMIN],
};

// Helper to check if role has permission
export const hasPermission = (role, permission) => {
  const normalizedRole = role?.toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole]?.includes(permission) ?? false;
};

// Check if role is read-only (SuperAdmin or Viewer)
export const isReadOnly = (role) => {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === ROLES.SUPERADMIN || normalizedRole === ROLES.VIEWER;
};
