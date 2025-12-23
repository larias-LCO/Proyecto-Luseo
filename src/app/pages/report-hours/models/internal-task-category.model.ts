export interface InternalTaskCategory {
    id: number;
    name: string;
    description: string | null;
    isMainTask: boolean;
    parentTaskId: number | null;
}