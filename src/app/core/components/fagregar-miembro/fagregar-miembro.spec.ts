import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FagregarMiembro } from './fagregar-miembro';

describe('FagregarMiembro', () => {
  let component: FagregarMiembro;
  let fixture: ComponentFixture<FagregarMiembro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FagregarMiembro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FagregarMiembro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
