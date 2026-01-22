import { GeneralTaskStatus } from "./enums/generalTask-status.enum";

export interface GeneralTask {
    id: number;
    name: string;
    description: string | null;
    issuedDate: Date;
    endDate: Date | null;

    taskCategoryName: string;
    taskCategoryId: number;
    taskCategoryColorHex: string;

    projectName: string;
    projectId: number;
    projectCode: string;
    projectType: string;
    projectManagerName: string;

    projectPhaseName: string;
    projectPhaseId: number;

    createByEmployeeName: string;
    createByEmployeeId: number;

    personalTask: boolean;
    personal_task: boolean;
    status: GeneralTaskStatus;
}