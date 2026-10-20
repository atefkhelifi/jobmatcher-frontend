import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18n } from '../core/i18n';
import { TrackButton } from './track-button';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(TrackButton);
  fixture.componentRef.setInput('jobId', 'j1');
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

const detail = { summary: { id: 'a1', status: 'TO_REVIEW' } };
const dup = (sameOffer: boolean) => ({ id: 'a0', title: 'Java Developer', company: 'Acme', status: 'APPLIED', createdAt: '2026-10-01T00:00:00Z', sameOffer });

describe('TrackButton', () => {
  it('shows the current stage when the same offer is already tracked, and does not offer to save it again', () => {
    const { fixture, http, el } = setup();
    http.expectOne((r) => r.url === '/api/applications/check').flush([dup(true)]);
    fixture.detectChanges();

    expect(el().textContent).toContain('In your tracker: Applied');
    expect(Array.from(el().querySelectorAll('button')).some((b) => b.textContent?.includes('Save to tracker'))).toBe(false);
    expect(el().querySelector('a')?.getAttribute('href')).toBe('/app/applications/a0');
  });

  it('saves a new role without asking for confirmation', () => {
    const { fixture, http, el } = setup();
    http.expectOne((r) => r.url === '/api/applications/check').flush([]);
    fixture.detectChanges();

    (el().querySelector('button') as HTMLButtonElement).click();
    const req = http.expectOne('/api/applications');
    expect(req.request.body).toEqual({ jobId: 'j1', cvId: null, confirmDuplicate: false });
    req.flush(detail, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(el().textContent).toContain('In your tracker: To review');
  });

  it('warns about the same role from another source and only saves after confirmation', () => {
    const { fixture, http, el } = setup();
    http.expectOne((r) => r.url === '/api/applications/check').flush([dup(false)]);
    fixture.detectChanges();

    expect(el().textContent).toContain('You already track this role');
    expect(el().textContent).toContain('The same role from another source');
    const confirm = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Add it anyway')) as HTMLButtonElement;
    confirm.click();
    const req = http.expectOne('/api/applications');
    expect(req.request.body).toEqual({ jobId: 'j1', cvId: null, confirmDuplicate: true });
    req.flush(detail, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(el().textContent).toContain('In your tracker');
  });

  it('turns a server-side duplicate answer into the same warning', () => {
    const { fixture, http, el } = setup();
    http.expectOne((r) => r.url === '/api/applications/check').flush([]);
    fixture.detectChanges();

    (el().querySelector('button') as HTMLButtonElement).click();
    http.expectOne('/api/applications').flush({ code: 'duplicate-application', details: [dup(false)] }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(el().textContent).toContain('You already track this role');
    expect(el().textContent).toContain('Add it anyway');
  });
});
