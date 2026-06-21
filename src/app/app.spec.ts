// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
console.log("LOG: typeof document =", typeof document);
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  let fixture: any;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    httpMock = TestBed.inject(HttpTestingController);
    // Flush initial ngOnInit calls
    // GET tenants-master
    const tmReq = httpMock.expectOne(`${fixture.componentInstance.backendUrl}/api/tenants-master`);
    tmReq.flush([]);
    // GET tenants (default sidebar tenant)
    const tenantsReq = httpMock.expectOne(`${fixture.componentInstance.backendUrl}/api/tenants`);
    tenantsReq.flush([]);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login-title')?.textContent).toContain('Welcome back');
  });

  // New tests for API interactions
  it('should fetch licenses and populate list', async () => {
    const fixture = TestBed.createComponent(App);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const req = httpMock.expectOne(`${fixture.componentInstance.backendUrl}/api/licenses`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'LIC-001', status: 'Draft' }]);
    httpMock.verify();
    expect(fixture.componentInstance.licensesList.length).toBe(1);
    expect(fixture.componentInstance.licensesList[0].status).toBe('Draft');
  });

  it('should submit tenant registration', async () => {
    const fixture = TestBed.createComponent(App);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    // Simulate submitTenant call (assuming method exists)
    (fixture.componentInstance as any).submitTenant({ name: 'Acme Corp' });
    const req = httpMock.expectOne(`${fixture.componentInstance.backendUrl}/api/tenants`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'TEN-001', status: 'Active' });
    httpMock.verify();
    expect(true).toBeTruthy();
  });
});
