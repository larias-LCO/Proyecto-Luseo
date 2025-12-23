import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubtaskModal } from './subtask-modal';

describe('SubtaskModal', () => {
  let component: SubtaskModal;
  let fixture: ComponentFixture<SubtaskModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubtaskModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubtaskModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
