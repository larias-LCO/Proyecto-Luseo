import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuFiltersProjects } from './menu-filters-projects';

describe('MenuFiltersProjects', () => {
  let component: MenuFiltersProjects;
  let fixture: ComponentFixture<MenuFiltersProjects>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuFiltersProjects]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuFiltersProjects);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
