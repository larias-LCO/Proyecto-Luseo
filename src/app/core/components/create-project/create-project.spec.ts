import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateProjectComponent } from './create-project';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('CreateProject', () => {
  let component: CreateProjectComponent;
  let fixture: ComponentFixture<CreateProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
