import { StateEmployee } from '../models/enums/state-employee.enum';

export interface Employee{

    id: number;
    name: string;
    email: string;
    billableRate: number;
    stateEmployee: StateEmployee;

    //Datos de tablas relacionadas
    departmentId: number;
    departmentName: string;

    //Datos de tablas relacionadas
    officeName: string;

    //Datos de tablas relacionadas
    jobPositionName: string;

    //Datos de tablas relacionadas
    accountId: number;
    accountUsername: string;
    accountRole: string;
}