import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppDetail } from '../core/api';
import { I18n } from '../core/i18n';
import { ApplicationDetailPage } from './application-detail';

const detail = (over: Partial<AppDetail> = {}): AppDetail => ({
  summary: {
    id: 'a1', jobId: null, title: 'Platform Engineer', company: 'Initech', location: 'Lyon', jobUrl: 'https://careers.initech.example/42', status: 'APPLIED',
    appliedAt: '2026-10-15T00:00:00Z', deadlineAt: null, statusChangedAt: '2026-10-15T00:00:00Z', createdAt: '2026-10-10T00:00:00Z', nextInterviewAt: null,
    nextReminderAt: null, openReminders: 0, overdueReminders: 0, allowedNext: ['INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  },
  cvId: null,
  notes: 'Salary talk after round two',
  allowedNext: ['INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  timeline: [
    { id: 't1', type: 'CREATED', from: null, to: 'TO_REVIEW', note: null, occurredAt: '2026-10-10T00:00:00Z' },
    { id: 't2', type: 'STATUS', from: 'TO_REVIEW', to: 'APPLIED', note: 'Sent via portal', occurredAt: '2026-10-15T00:00:00Z' },
  ],
  contacts: [{ id: 'c1', name: 'Marie Dupont', role: 'Recruiter', email: 'marie@initech.example', phone: null, note: null }],
  interviews: [],
  reminders: [{ id: 'r1', applicationId: 'a1', applicationTitle: 'Platform Engineer', dueAt: '2026-10-18T09:00:00Z', text: 'Follow up', doneAt: null, overdue: true }],
  attachments: [{ id: 'x1', kind: 'LINK', documentId: null, label: 'Careers portal', url: 'https://careers.initech.example/me' }],
  ...over,
});

function setup(d: AppDetail) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(ApplicationDetailPage);
  fixture.componentRef.setInput('id', 'a1');
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/applications/a1').flush(d);
  fixture.detectChanges();
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

describe('ApplicationDetailPage', () => {
  it('shows the timeline with readable status moves, notes, contacts, reminders and links', () => {
    const { el } = setup(detail());
    const text = el().textContent ?? '';

    expect(text).toContain('Platform Engineer');
    expect(text).toContain('To review → Applied');
    expect(text).toContain('Sent via portal');
    expect(text).toContain('Marie Dupont');
    expect(text).toContain('marie@initech.example');
    expect(text).toContain('Follow up');
    expect(text).toContain('Careers portal');
    expect((el().querySelector('#d-notes') as HTMLTextAreaElement).value).toBe('Salary talk after round two');
    const link = el().querySelector('a[href="https://careers.initech.example/me"]');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('offers only the allowed next stages as buttons', () => {
    const { el } = setup(detail());
    const labels = Array.from(el().querySelectorAll('.steps button')).map((b) => b.textContent?.trim());

    expect(labels).toEqual(['Interview scheduled', 'Offer received', 'Rejected', 'Withdrawn']);
  });

  it('tells the user a closed application is final and offers no stage buttons', () => {
    const base = detail();
    const closed = detail({ allowedNext: [], summary: { ...base.summary, status: 'REJECTED', allowedNext: [] } });
    const { el } = setup(closed);

    expect(el().textContent).toContain('This application is closed');
    expect(el().querySelectorAll('.steps button').length).toBe(0);
  });

  it('moves the application and sends the optional note', () => {
    const { fixture, http, el } = setup(detail());

    const note = el().querySelector('#st-note') as HTMLInputElement;
    note.value = 'Phone screen booked';
    note.dispatchEvent(new Event('input'));
    (Array.from(el().querySelectorAll('.steps button')).find((b) => b.textContent?.includes('Interview scheduled')) as HTMLButtonElement).click();

    const req = http.expectOne('/api/applications/a1/status');
    expect(req.request.body).toEqual({ status: 'INTERVIEW', note: 'Phone screen booked', followUpDays: null });
    req.flush(detail({ allowedNext: ['ASSESSMENT', 'OFFER', 'REJECTED', 'WITHDRAWN'] }));
    fixture.detectChanges();
    expect(el().textContent).toBeTruthy();
  });

  it('adds a reminder as an absolute instant and refuses an empty form', () => {
    const { fixture, http, el } = setup(detail());

    const submit = () => (el().querySelector('#r-text')?.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    submit();
    http.expectNone('/api/applications/a1/reminders');

    const text = el().querySelector('#r-text') as HTMLInputElement;
    text.value = 'Email the recruiter';
    text.dispatchEvent(new Event('input'));
    const due = el().querySelector('#r-due') as HTMLInputElement;
    due.value = '2026-11-03T09:30';
    due.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submit();

    const req = http.expectOne('/api/applications/a1/reminders');
    expect(req.request.body.text).toBe('Email the recruiter');
    expect(req.request.body.dueAt).toBe(new Date('2026-11-03T09:30').toISOString());
    req.flush(detail());
  });

  it('rejects links that are not http or https before sending anything', () => {
    const { fixture, http, el } = setup(detail());

    const label = el().querySelector('#l-label') as HTMLInputElement;
    label.value = 'Evil';
    label.dispatchEvent(new Event('input'));
    const url = el().querySelector('#l-url') as HTMLInputElement;
    url.value = 'javascript:alert(1)';
    url.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (label.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    http.expectNone('/api/applications/a1/attachments');
    expect((label.closest('form')?.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
  });
});
