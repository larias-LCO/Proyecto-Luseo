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
    
    // New BIM / discipline-specific description fields (nullable)
    bim_date?: Date | null;
    description_bim?: string | null;
    description_electrical?: string | null;
    description_mechanical?: string | null;
    description_plumbing?: string | null;
    description_structural?: string | null;
    status: GeneralTaskStatus;
}