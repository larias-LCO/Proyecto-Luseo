import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarTask } from './calendar-task';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

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

