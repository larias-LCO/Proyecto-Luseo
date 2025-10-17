import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarMiembroComponent } from './editar-miembro';

describe('EditarMiembroComponent', () => {
  let component: EditarMiembroComponent;
  let fixture: ComponentFixture<EditarMiembroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarMiembroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarMiembroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
