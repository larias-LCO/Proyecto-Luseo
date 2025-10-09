import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParteDeHorasComponent } from './parte-de-horas';

describe('ParteDeHoras', () => {
  let component: ParteDeHorasComponent;
  let fixture: ComponentFixture<ParteDeHorasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParteDeHorasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParteDeHorasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
