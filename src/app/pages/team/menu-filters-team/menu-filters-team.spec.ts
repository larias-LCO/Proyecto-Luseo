import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuFiltersTeam } from './menu-filters-team';

describe('MenuFiltersTeam', () => {
  let component: MenuFiltersTeam;
  let fixture: ComponentFixture<MenuFiltersTeam>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuFiltersTeam]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuFiltersTeam);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
