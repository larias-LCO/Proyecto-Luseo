export function normalizeText(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(str: string): string[] {
  const norm = normalizeText(str);
  return norm ? norm.split(" ") : [];
}

export function matchesByTokens(employeeName: string, query: string): boolean {
  const nameNorm = normalizeText(employeeName);
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  return tokens.every(t => nameNorm.includes(t));
}

export function extractRoles(emp: any): string[] {
  if (!emp) return [];
  const candidates = [emp.accountRole, emp.roles, emp.account?.role, emp.account?.roles, emp.accountRoles, emp.account?.authorities];
  for (const c of candidates) {
    if (!c) continue;
    if (Array.isArray(c)) {
      return c.map(item => typeof item === 'string' ? item : item?.name || item?.role || item?.authority || item?.rol || item?.roleName || item?.label || item?.toString?.()).filter(Boolean);
    }
    if (typeof c === 'string') return [c];
    if (typeof c === 'object') {
      const single = c.name || c.role || c.authority || c.rol || c.roleName || c.label || c.toString?.();
      return single ? [single] : [];
    }
  }
  return [];
}

export function filterEmployees(employees: any[], filters: any): any[] {
  const { query, department, jobPosition, office, state, role } = filters;
  const q = normalizeText(query);
  return employees.filter(e => {
    if (q && !matchesByTokens(e.name, q)) return false;
    if (department && (e.departmentName ?? "") !== department) return false;
    if (jobPosition && (e.jobPositionName ?? "") !== jobPosition) return false;
    if (office && (e.officeName ?? "") !== office) return false;
    if (state && (e.state ?? "") !== state) return false;
    if (role) {
      const roles = extractRoles(e).map(r => normalizeText(r));
      if (!roles.includes(normalizeText(role))) return false;
    }
    return true;
  });
}