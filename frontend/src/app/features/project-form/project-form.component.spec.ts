import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api-config';
import { ProjectFormComponent } from './project-form.component';

/**
 * The form's job is to agree with the server, and to say so next to the right
 * control when it does not. These cover both halves: the client rules that
 * mirror the server's, and the mapping of a server 400 back onto the fields.
 */
describe('ProjectFormComponent', () => {
  let fixture: ComponentFixture<ProjectFormComponent>;
  let http: HttpTestingController;

  const BASE = 'http://api.test/api';

  const validProject = {
    code: 'PRJ-123',
    name: 'Valid project name',
    owner: 'Test Owner',
    status: 'InProgress',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 100000,
    actualCost: 0,
    progress: 10,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectFormComponent);
    fixture.componentRef.setInput('portfolioId', '1');
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function text(selector: string): string {
    return (
      fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? ''
    );
  }

  function setValue(controlName: string, value: unknown): void {
    const form = (fixture.componentInstance as never as {
      form: { get(name: string): { setValue(v: unknown): void } | null };
    }).form;

    form.get(controlName)?.setValue(value);
  }

  function fillValidForm(): void {
    for (const [key, value] of Object.entries(validProject)) {
      setValue(key, value);
    }
  }

  function submit(): void {
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    button.click();
    fixture.detectChanges();
  }

  it('shows client-side errors and sends nothing when the form is empty', () => {
    submit();

    expect(text('#code-message')).toBe('Code is required.');
    expect(text('#name-message')).toBe('Name is required.');
    expect(text('#owner-message')).toBe('Owner is required.');

    // The invalid state is driven by aria-invalid, which is what bundle.css styles.
    expect(
      fixture.nativeElement.querySelector('#code').getAttribute('aria-invalid')
    ).toBe('true');

    http.expectNone(() => true);
  });

  it('rejects a code that is not PRJ- plus exactly three digits', () => {
    fillValidForm();
    setValue('code', 'PRJ-12');
    submit();

    expect(text('#code-message')).toContain('exactly 3 digits');
    http.expectNone(() => true);
  });

  it('mirrors the server rule that end date cannot precede start date', () => {
    fillValidForm();
    setValue('startDate', '2027-01-01');
    setValue('endDate', '2026-01-01');
    submit();

    expect(text('#endDate-message')).toBe(
      'End date must be on or after start date.'
    );
    http.expectNone(() => true);
  });

  it('mirrors the server rule that Completed requires 100% progress', () => {
    fillValidForm();
    setValue('status', 'Completed');
    setValue('progress', 50);
    submit();

    expect(text('#progress-message')).toBe(
      'Progress must be 100 when status is Completed.'
    );
    http.expectNone(() => true);
  });

  it('never sends a health value, because the payload has no such field', () => {
    fillValidForm();
    submit();

    const request = http.expectOne(`${BASE}/portfolios/1/projects`);

    expect(request.request.method).toBe('POST');
    expect(Object.keys(request.request.body)).not.toContain('health');

    request.flush({ ...validProject, id: 1, portfolioId: 1, health: 'Green' });
  });

  it('shows a server 400 next to the field named in the errors dictionary', () => {
    fillValidForm();
    submit();

    const request = http.expectOne(`${BASE}/portfolios/1/projects`);

    // The shape ASP.NET Core returns, with camelCase field keys.
    request.flush(
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          endDate: ['End date must be on or after start date.'],
          progress: ['Progress must be 100 when status is Completed.'],
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    fixture.detectChanges();

    expect(text('#endDate-message')).toBe(
      'End date must be on or after start date.'
    );
    expect(text('#progress-message')).toBe(
      'Progress must be 100 when status is Completed.'
    );
    expect(
      fixture.nativeElement.querySelector('#endDate').getAttribute('aria-invalid')
    ).toBe('true');
  });

  it('shows a 409 on the code field, because the code is the only unique rule', () => {
    fillValidForm();
    submit();

    http.expectOne(`${BASE}/portfolios/1/projects`).flush(
      {
        title: 'Conflict',
        status: 409,
        detail: 'Project code PRJ-123 is already in use.',
      },
      { status: 409, statusText: 'Conflict' }
    );

    fixture.detectChanges();

    expect(text('#code-message')).toBe('Project code PRJ-123 is already in use.');
  });
});
