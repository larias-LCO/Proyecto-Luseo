import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Project } from '../../models/project.model';
import { mapProjectToCard, ProjectCardVM } from '../../utils/mappers/project.mapper';
import { IconButtonComponent } from "../../../../core/components/animated-icons/icon-button.component";

@Component({
  selector: 'app-project-cards',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, IconButtonComponent],
  templateUrl: './project-cards.html',
  styleUrls: ['./project-cards.scss']
})
export class ProjectCards implements OnInit, OnChanges {
  @Input() projects: Project[] = [];
  @Output() cardClick = new EventEmitter<Project>();

  // Property instead of getter to avoid excessive re-evaluation
  cards: ProjectCardVM[] = [];

  ngOnInit(): void {
    this.updateCards();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.updateCards();
    }
  }

  private updateCards(): void {
    this.cards = this.projects.map(mapProjectToCard);
  }

  handleClick(projectId: number): void {
    
    // Find the full project object (same logic as JS version)
    const project = this.projects.find(p => p.id === projectId);
    
    if (project) {
      this.cardClick.emit(project);
    } else {
      console.error('[ProjectCards] ❌ Project not found for ID:', projectId);
    }
  }
}