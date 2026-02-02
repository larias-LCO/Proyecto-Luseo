export interface ScheduleFilters {
  projectIds: number[];
  categoryIds: number[];
  myProjectsOnly?: boolean;
  createdByMe?: boolean;
  createdByEmployeeIds?: number[];
}

export function createDefaultFilters(): ScheduleFilters {
  return {
    projectIds: [],
    categoryIds: [],
    myProjectsOnly: false,
    createdByMe: false
    ,createdByEmployeeIds: []
  };
}

export default {
  createDefaultFilters
};
