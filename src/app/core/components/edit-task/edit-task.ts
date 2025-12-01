import { Component, Input, Output, EventEmitter } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-edit-task',
  imports: [JsonPipe],
  templateUrl: './edit-task.html',
  styleUrl: './edit-task.scss'
})
export class EditTask {
  @Input() task: any;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
