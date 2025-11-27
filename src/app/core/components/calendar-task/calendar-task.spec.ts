import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarTask } from './calendar-task';

describe('CalendarTask', () => {
  let component: CalendarTask;
  let fixture: ComponentFixture<CalendarTask>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarTask]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarTask);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
