import { Project } from '../../models/project.model';

export interface ProjectCardVM {
  id: number;
  code: string;
  name: string;
  pmName: string;
  pmInitials: string;
}

export function mapProjectToCard(project: Project): ProjectCardVM {
  const pmName = project.pmNames?.[0] ?? 'N/A';

  return {
    id: project.id,
    code: project.projectCode || 'N/A',
    name: project.name || 'Unnamed Project',
    pmName,
    pmInitials: pmName
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PM'
  };
}