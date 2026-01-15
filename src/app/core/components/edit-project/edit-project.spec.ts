import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProjectComponent } from './edit-project';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('EditProjectComponent', () => {
  let component: EditProjectComponent;
  let fixture: ComponentFixture<EditProjectComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
