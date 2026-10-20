import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationsPage } from './notifications';
import { Notifications } from '../core/notifications';

describe('Notifications page', () => {
  it('renders each kind from its code and keeps the badge in step', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(NotificationsPage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/notifications').flush([
      { id: '1', type: 'NEW_MATCHES', code: 'alert.newMatches', link: '/app/jobs', createdAt: '2026-10-20T10:00:00Z', readAt: null,
        params: { search: 'Java', count: 2, minScore: 60, top: [{ title: 'Java Developer', company: 'Acme', score: 81 }] } },
      { id: '2', type: 'REMINDER_DUE', code: 'reminder.due', link: '/app/applications/9', createdAt: '2026-10-20T09:00:00Z', readAt: null,
        params: { title: 'QA Engineer', company: 'Globex' } },
    ]);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 new offer(s) from "Java"');
    expect(text).toContain('Java Developer · Acme (81)');
    expect(text).toContain('Follow-up due: QA Engineer · Globex');
    expect(TestBed.inject(Notifications).unread()).toBe(2);
    http.verify();
  });
});
