import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapacityCalendar } from './capacity-calendar';

describe('CapacityCalendar', () => {
  let component: CapacityCalendar;
  let fixture: ComponentFixture<CapacityCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapacityCalendar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
