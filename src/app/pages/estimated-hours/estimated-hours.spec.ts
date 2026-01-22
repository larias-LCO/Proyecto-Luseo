import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimatedHoursPage } from './estimated-hours';

describe('EstimatedHours', () => {
  let component: EstimatedHoursPage;
  let fixture: ComponentFixture<EstimatedHoursPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstimatedHoursPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimatedHoursPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
