export type Role = 'OWNER' | 'ADMIN' | 'USER';

export interface PermissionContext {
  myEmployeeId?: number;
  myRole?: Role;
  isCoordinator?: boolean;
  myDepartmentId?: number;
  employeeDepartmentMap?: Record<number, number>;
}

export function isHolidayEntry(e: any): boolean {
  return !!(e && (e.type === 'HOLIDAY' || e.isHoliday));
}

export function isEntryVisible(entry: any, ctx?: PermissionContext): boolean {
  if (!entry) return false;
  if (isHolidayEntry(entry)) return true; // holidays always visible

  const uid = entry.userId;
  const role = ctx?.myRole || 'USER';

  if (role === 'OWNER') return true;

  if (role === 'ADMIN' && ctx?.isCoordinator && ctx?.myDepartmentId != null) {
    return uid === ctx.myEmployeeId || (ctx.employeeDepartmentMap || {})[uid] === ctx.myDepartmentId;
  }

  // Default: user and admins without coordinator role see only their own entries
  return uid === ctx?.myEmployeeId;
}

export function filterEntriesByPermissions(entries: any[], ctx?: PermissionContext): any[] {
  if (!entries || entries.length === 0) return [];
  return entries.filter(e => isEntryVisible(e, ctx));
}
