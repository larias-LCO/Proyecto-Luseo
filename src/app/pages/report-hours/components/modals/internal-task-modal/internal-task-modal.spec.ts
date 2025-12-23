import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalTaskModal } from './internal-task-modal';

describe('InternalTaskModal', () => {
  let component: InternalTaskModal;
  let fixture: ComponentFixture<InternalTaskModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalTaskModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternalTaskModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
