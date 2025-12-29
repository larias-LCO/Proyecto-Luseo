import { TimeEntry } from '../../models/time-entry.model';

export interface EmployeeOption {
  id: number;
  name: string;
}

export function buildEmployeesWithReports(
  entries: TimeEntry[],
  options: {
    myRole: 'OWNER' | 'ADMIN' | 'USER';
    isCoordinator: boolean;
    myDepartmentId?: number;
    employeeDepartmentMap: Record<number, number>;
  }
): EmployeeOption[] {

  const employeeMap = new Map<number, EmployeeOption>();

  entries.forEach(e => {
    if (!employeeMap.has(e.userId)) {
      employeeMap.set(e.userId, {
        id: e.userId,
        name: e.userName
      });
    }
  });

  let employees = Array.from(employeeMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  // ADMIN-Coordinator → only their department
  if (
    options.myRole === 'ADMIN' &&
    options.isCoordinator &&
    options.myDepartmentId
  ) {
    employees = employees.filter(emp =>
      options.employeeDepartmentMap[emp.id] === options.myDepartmentId
    );
  }

  return employees;
}