import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearProyecto } from './crear-proyecto';

describe('CrearProyecto', () => {
  let component: CrearProyecto;
  let fixture: ComponentFixture<CrearProyecto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearProyecto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearProyecto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
