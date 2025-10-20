import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarProyecto } from './editar-proyecto';

describe('EditarProyecto', () => {
  let component: EditarProyecto;
  let fixture: ComponentFixture<EditarProyecto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarProyecto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarProyecto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
