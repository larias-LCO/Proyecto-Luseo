import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class ProjectCards implements OnInit, OnChanges {
  @Input() projects: Project[] = [];
  @Output() cardClick = new EventEmitter<Project>();

  // Property instead of getter to avoid excessive re-evaluation
  cards: ProjectCardVM[] = [];

  ngOnInit(): void {
    console.log('[ProjectCards] 🎉 Component initialized');
    console.log('[ProjectCards] 📊 Projects received:', this.projects?.length || 0);
    this.updateCards();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      console.log('[ProjectCards] 🔄 Projects changed, updating cards');
      this.updateCards();
    }
  }

  private updateCards(): void {
    this.cards = this.projects.map(mapProjectToCard);
    console.log('[ProjectCards] 📋 Cards updated, count:', this.cards.length);
  }

  handleClick(projectId: number): void {
    console.log('[ProjectCards] ✅ Card clicked!', { projectId });
    
    // Find the full project object (same logic as JS version)
    const project = this.projects.find(p => p.id === projectId);
    
    if (project) {
      console.log('[ProjectCards] 📦 Found project:', project);
      console.log('[ProjectCards] 📤 Emitting cardClick event with full project object');
      this.cardClick.emit(project);
      console.log('[ProjectCards] ✅ Event emitted successfully');
    } else {
      console.error('[ProjectCards] ❌ Project not found for ID:', projectId);
    }
  }
}