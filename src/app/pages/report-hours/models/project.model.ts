import { AreaUnit} from '../models/enums/area-unit.enum';
import {ProjectType} from '../models/enums/project-type.enum';
import {ProjectScope} from '../models/enums/project-scope.enum';
import {ProjectState} from '../models/enums/project-state.enum';

export interface Project {
  id: number;
  projectCode: string;
  name: string;

  projectArea: number | null;
  areaUnit: AreaUnit;

  projectType: ProjectType;
  scope: ProjectScope;
  status: ProjectState;

  notes: string | null;

  // Datos de tablas relacionadas
  clientName: string;
  officeName: string;

  softwareName: string;
  softwareDescription: string;

  estimatedCost: number | null;
  realCost: number | null;

  estimatedTime: number | null;
  realTime: number | null;

  floridaTrackedTime: number | null;

  // Relaciones empleados (tabla relacionada)
  employeeIds: number[];
  employeeNames: string[];

  departments: string[];
  roles: string[];

  pmIds: number[];
  pmNames: string[];
}