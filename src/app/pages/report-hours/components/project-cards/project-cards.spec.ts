import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectCards } from './project-cards';

describe('ProjectCards', () => {
  let component: ProjectCards;
  let fixture: ComponentFixture<ProjectCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCards]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectCards);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
