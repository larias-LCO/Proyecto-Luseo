import { Project } from '../../models/project.model';
import { ReportHoursFilters } from '../../models/filters.model';

export function extractYearFromCode(code?: string): number | null {
  if (!code || code.length < 2) return null;

  const year = Number(code.substring(0, 2));
  return Number.isNaN(year) ? null : year;
}

export function getAvailableProjectYears(projects: Project[]): number[] {
  const years = new Set<number>();

  projects.forEach(p => {
    const year = extractYearFromCode(p.projectCode);
    if (year !== null) {
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

export function applyProjectFilters(
  projects: Project[],
  filters: ReportHoursFilters,
  myEmployeeId?: number
): Project[] {
  const search = filters.searchText?.trim();

  let result = projects;

  // If there's a search term, ignore the year filter and search across all projects
  if (search && search.length > 0) {
    const s = search.toLowerCase();
    result = result.filter(p =>
      (p.name ?? '').toLowerCase().includes(s) ||
      (p.projectCode ?? '').toLowerCase().includes(s) ||
      (p.clientName ?? '').toLowerCase().includes(s)
    );
  } else {
    // Apply year filter only when there's no search
    if (filters.year) {
      result = result.filter(p => extractYearFromCode(p.projectCode) === filters.year);
    }
  }

  // Apply "My projects" filter on top of the previous result
  if (filters.myProjectsOnly && myEmployeeId != null) {
    const empId = Number(myEmployeeId);

    result = result.filter(p => {
      const empIds = (p.employeeIds || []).map(id => Number(id));
      const pmIds = (p.pmIds || []).map(id => Number(id));

      return empIds.includes(empId) || pmIds.includes(empId);
    });
  }

  return result;
}