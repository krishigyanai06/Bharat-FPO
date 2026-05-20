import { useSelector } from 'react-redux';
import { hasPermission, isReadOnly as checkReadOnly, PERMISSIONS } from '../config/rbac';

export function usePermissions() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role?.toLowerCase();

  return {
    canCreate: hasPermission(role, PERMISSIONS.CREATE),
    canUpdate: hasPermission(role, PERMISSIONS.UPDATE),
    canDelete: hasPermission(role, PERMISSIONS.DELETE),
    isReadOnly: checkReadOnly(role),
    role,
  };
}
