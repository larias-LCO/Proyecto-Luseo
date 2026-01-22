import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneralTask } from '../../models/general-task.model';

/**
 * Componente para renderizar tarjetas de General Task
 * Usado en el calendario de Schedule
 */
@Component({
  selector: 'app-general-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './general-task-card.html',
  styleUrl: './general-task-card.scss'
})
export class GeneralTaskCard {
  @Input() task!: GeneralTask;
  @Input() compact: boolean = true;
  @Input() categoryColor: string = '#6c757d';
  @Input() textColor: string = '#ffffff';

  get statusConfig() {
    const configs = {
      'IN_PROGRESS': { text: 'In Progress', color: '#1e40af', bg: '#dbeafe', icon: '⏱️' },
      'COMPLETED': { text: 'Completed', color: '#065f46', bg: '#d1fae5', icon: '✅' },
      'PAUSED': { text: 'Paused', color: '#92400e', bg: '#fef3c7', icon: '⛔' }
    };
    const status = this.task?.status || 'IN_PROGRESS';
    return configs[status as keyof typeof configs] || configs['IN_PROGRESS'];
  }

  get projectTypeIcon() {
    if (this.task?.projectType === 'COMMERCIAL') return '🏢';
    if (this.task?.projectType === 'RESIDENTIAL') return '🏠';
    return '';
  }

  get isCompleted() {
    return this.task?.status === 'COMPLETED';
  }

  get pmName() {
    return this.task?.projectManagerName || '';
  }

  get creatorName() {
    return this.task?.createByEmployeeName || '';
  }
}
