export interface ScheduleFilters {
  projectIds: number[];
  categoryIds: number[];
  myProjectsOnly?: boolean;
  createdByMe?: boolean;
}

export function createDefaultFilters(): ScheduleFilters {
  return {
    projectIds: [],
    categoryIds: [],
    myProjectsOnly: false,
    createdByMe: false
  };
}

export default {
  createDefaultFilters
};
