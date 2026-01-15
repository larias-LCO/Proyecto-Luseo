import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDetailsComponent } from './project-details';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('ProjectDetails', () => {
  let component: ProjectDetailsComponent;
  let fixture: ComponentFixture<ProjectDetailsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
