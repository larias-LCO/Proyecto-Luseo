import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarMiembro } from './editar-miembro';

describe('EditarMiembro', () => {
  let component: EditarMiembro;
  let fixture: ComponentFixture<EditarMiembro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarMiembro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarMiembro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
