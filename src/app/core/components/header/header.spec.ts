import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header';
import { AuthService } from '../../services/auth.service';
import { CatalogsService } from '../../services/catalogs.service';
import { SubmenuService } from '../../services/submenu.service';
import { AuthService as ReportApiAuthService } from '../../../pages/report-hours/auth/services/auth-api.service';

declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    const mockAuthService: Partial<AuthService> = {
      state: (() => ({ authenticated: false })) as any,
      logout: () => {},
      getApiBase: () => ''
    };
    const mockCatalogs: Partial<CatalogsService> = {
      getEmployees: async () => []
    };
    const mockReportApi: any = {
      logout: () => ({ subscribe: (o: any) => o.next && o.next() })
    };
    const mockSubmenu: any = {
      openSubject: { value: false } as any,
      toggle: () => {},
      open$: ({ subscribe: (_: any) => ({ unsubscribe: () => {} }) } as any)
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CatalogsService, useValue: mockCatalogs },
        { provide: ReportApiAuthService, useValue: mockReportApi },
        { provide: SubmenuService, useValue: mockSubmenu }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
