export interface ReportHoursFilters {
  year: number;

  searchText?: string;

  myProjectsOnly: boolean;
  onlyMyReports: boolean;

  selectedEmployeeId?: number;
}