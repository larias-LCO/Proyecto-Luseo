import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Project } from '../../models/project.model';
import { mapProjectToCard, ProjectCardVM } from '../../utils/mappers/project.mapper';

@Component({
  selector: 'app-project-cards',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './project-cards.html',
  styleUrls: ['./project-cards.scss']
})
export class ProjectCards {
  @Input() projects: Project[] = [];
  @Output() projectSelected = new EventEmitter<number>();

  get cards(): ProjectCardVM[] {
    return this.projects.map(mapProjectToCard);
  }

  selectProject(id: number) {
    this.projectSelected.emit(id);
  }
}
