import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmenuComponent } from './submenu';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

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
