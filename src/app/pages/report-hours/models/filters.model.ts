export interface ReportHoursFilters {
  year: number | null;

  searchText?: string;

  myProjectsOnly: boolean;
  onlyMyReports: boolean;

  selectedEmployeeId?: number;
}