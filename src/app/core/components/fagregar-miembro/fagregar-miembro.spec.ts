import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FagregarMiembroComponent } from './fagregar-miembro';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('FagregarMiembro', () => {
  let component: FagregarMiembroComponent;
  let fixture: ComponentFixture<FagregarMiembroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FagregarMiembroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FagregarMiembroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
