import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppSummary } from '../core/api';
import { I18n } from '../core/i18n';
import { Applications } from './applications';

const app = (over: Partial<AppSummary>): AppSummary => ({
  id: 'a1', jobId: 'j1', title: 'Java Developer', company: 'Acme', location: 'Berlin', jobUrl: null, status: 'TO_REVIEW', appliedAt: null, deadlineAt: null,
  statusChangedAt: '2026-10-20T10:00:00Z', createdAt: '2026-10-20T10:00:00Z', nextInterviewAt: null, nextReminderAt: null, openReminders: 0, overdueReminders: 0,
  allowedNext: ['SHORTLISTED', 'APPLIED', 'WITHDRAWN'], ...over,
});

function setup(list: AppSummary[]) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(Applications);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/applications').flush(list);
  fixture.detectChanges();
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

describe('Applications board', () => {
  it('explains an empty tracker', () => {
    const { el } = setup([]);
    expect(el().textContent).toContain('Nothing tracked yet');
  });

  it('places applications in their stage columns and puts closed ones in a separate list', () => {
    const { el } = setup([
      app({ id: 'a1', title: 'Java Developer' }),
      app({ id: 'a2', title: 'Data Engineer', status: 'APPLIED', allowedNext: ['INTERVIEW'] }),
      app({ id: 'a3', title: 'Old Role', status: 'REJECTED', allowedNext: [] }),
    ]);

    const column = (label: string) => Array.from(el().querySelectorAll('section.col')).find((c) => c.getAttribute('aria-label') === label) as HTMLElement;
    expect(column('To review').textContent).toContain('Java Developer');
    expect(column('Applied').textContent).toContain('Data Engineer');
    expect(column('Interview scheduled')).toBeUndefined(); // empty stages are not columns
    expect(el().textContent).toContain('No applications in:');
    expect(el().textContent).toContain('Interview scheduled');
    expect(el().querySelector('details:not(.card)')?.textContent).toContain('Old Role');
    expect(el().querySelector('details:not(.card)')?.textContent).toContain('Closed');
  });

  it('offers only the moves the server allows and asks for a follow-up reminder when applying', () => {
    const { fixture, http, el } = setup([app({ id: 'a1' })]);

    const select = el().querySelector('article select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Move to…', 'Shortlisted', 'Applied', 'Withdrawn']);
    select.value = 'APPLIED';
    select.dispatchEvent(new Event('change'));

    const req = http.expectOne('/api/applications/a1/status');
    expect(req.request.body).toEqual({ status: 'APPLIED', note: null, followUpDays: 7 });
    req.flush({});
    http.expectOne('/api/applications').flush([app({ id: 'a1', status: 'APPLIED', allowedNext: ['INTERVIEW'] })]);
    fixture.detectChanges();

    expect(Array.from(el().querySelectorAll('section.col')).find((c) => c.getAttribute('aria-label') === 'Applied')?.textContent).toContain('Java Developer');
  });

  it('flags overdue reminders and shows the next interview and deadline', () => {
    const { el } = setup([
      app({ id: 'a1', overdueReminders: 2, openReminders: 2, nextReminderAt: '2026-10-01T09:00:00Z', nextInterviewAt: '2027-03-02T09:00:00Z', deadlineAt: '2027-04-01T00:00:00Z' }),
    ]);

    expect(el().textContent).toContain('2 overdue');
    expect(el().textContent).toContain('Interview');
    expect(el().textContent).toContain('Deadline');
  });

  it('shows the reason when a move is refused', () => {
    const { fixture, http, el } = setup([app({ id: 'a1' })]);

    const select = el().querySelector('article select') as HTMLSelectElement;
    select.value = 'SHORTLISTED';
    select.dispatchEvent(new Event('change'));
    http.expectOne('/api/applications/a1/status').flush({ detail: 'An application cannot move from TO_REVIEW to SHORTLISTED.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(el().textContent).toContain('An application cannot move from TO_REVIEW to SHORTLISTED.');
  });
});
