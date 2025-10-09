import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmenuComponent } from './submenu';

describe('Submenu', () => {
  let component: SubmenuComponent;
  let fixture: ComponentFixture<SubmenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
