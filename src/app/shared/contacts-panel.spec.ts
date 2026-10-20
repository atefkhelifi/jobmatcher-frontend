import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactView, ContactsView } from '../core/api';
import { I18n } from '../core/i18n';
import { ContactsPanel } from './contacts-panel';

const email: ContactView = {
  id: 'c1',
  kind: 'EMAIL',
  value: 'careers@acme-corp.io',
  name: null,
  title: null,
  sourceUrl: 'https://careers.acme-corp.io/jobs/1',
  sourceKind: 'OFFICIAL_PAGE',
  verified: true,
  discoveredAt: '2026-10-20T10:00:00Z',
};

function setup(view: ContactsView) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(ContactsPanel);
  fixture.componentRef.setInput('jobId', 'j1');
  fixture.detectChanges();
  TestBed.inject(HttpTestingController).expectOne('/api/jobs/j1/contacts').flush(view);
  fixture.detectChanges();
  return { fixture, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
}

describe('ContactsPanel', () => {
  it('says plainly when nothing was published and still offers the official application link', () => {
    const { text, fixture } = setup({
      contacts: [],
      applyUrl: 'https://careers.acme-corp.io/apply/1',
      jobUrl: 'https://x.example/1',
      searched: true,
      searchedAt: '2026-10-20T10:00:00Z',
      pagesRead: 2,
      note: null,
      hasEmail: false,
    });
    expect(text()).toContain('No publicly available HR email found');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="https://careers.acme-corp.io/apply/1"]');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('does not claim anything before a search has run', () => {
    const { text } = setup({
      contacts: [],
      applyUrl: null,
      jobUrl: 'https://x.example/1',
      searched: false,
      searchedAt: null,
      pagesRead: 0,
      note: null,
      hasEmail: false,
    });
    expect(text()).toContain('Not searched yet.');
    expect(text()).not.toContain('No publicly available HR email found');
  });

  it('labels verified and unverified contacts, shows the source, and lets the user pick a recipient', () => {
    const unverified: ContactView = { ...email, id: 'c2', value: 'press@other.io', verified: false };
    const { fixture, text } = setup({
      contacts: [email, unverified],
      applyUrl: null,
      jobUrl: 'https://x.example/1',
      searched: true,
      searchedAt: '2026-10-20T10:00:00Z',
      pagesRead: 1,
      note: 'board',
      hasEmail: true,
    });
    expect(text()).toContain('Verified public');
    expect(text()).toContain('Unverified');
    expect(text()).toContain('https://careers.acme-corp.io/jobs/1');
    expect(text()).toContain('job board');
    expect(text()).not.toContain('No publicly available HR email found');

    let chosen: ContactView | null | undefined;
    fixture.componentInstance.chooseContact.subscribe((c) => (chosen = c));
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Use as email recipient'),
    );
    button?.click();
    expect(chosen?.value).toBe('careers@acme-corp.io');
  });
});
