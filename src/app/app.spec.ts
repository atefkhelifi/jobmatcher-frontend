import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Auth } from './core/auth';

describe('App shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('shows sign-in and sign-up links when nobody is logged in', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Create account');
    expect(text).not.toContain('My CVs');
  });

  it('shows the main navigation once a user is set', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).set({ id: '1', email: 'a@example.org', displayName: 'A', preferredLanguage: 'en' });
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('My CVs');
    expect(text).toContain('Sign out');
    expect(text).toContain('Notifications');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/notifications/unread-count').flush({ unread: 3 });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('3');
    http.verify();
  });
});
