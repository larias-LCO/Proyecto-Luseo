import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTaskCard } from './create-task-card';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('CreateTaskCard', () => {
  let component: CreateTaskCard;
  let fixture: ComponentFixture<CreateTaskCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTaskCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTaskCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
