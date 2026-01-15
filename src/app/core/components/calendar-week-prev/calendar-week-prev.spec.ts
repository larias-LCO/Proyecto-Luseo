import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarWeekPrev } from './calendar-week-prev';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('CalendarWeekPrev', () => {
  let component: CalendarWeekPrev;
  let fixture: ComponentFixture<CalendarWeekPrev>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarWeekPrev]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarWeekPrev);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
