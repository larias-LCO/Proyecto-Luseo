import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsPage } from './projects';

describe('Projects', () => {
  let component: ProjectsPage;
  let fixture: ComponentFixture<ProjectsPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
