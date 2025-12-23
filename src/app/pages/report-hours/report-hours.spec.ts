import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportHours } from './report-hours';

describe('ReportHours', () => {
  let component: ReportHours;
  let fixture: ComponentFixture<ReportHours>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportHours]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportHours);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
