import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DocView } from '../core/api';
import { I18n } from '../core/i18n';
import { DocWorkspace } from './doc-workspace';

const letter: DocView = {
  id: 'd1',
  jobId: 'j1',
  type: 'LETTER',
  language: 'en',
  version: 1,
  source: 'GENERATED',
  generator: 'template',
  subject: null,
  body: 'Dear Sir or Madam,\n\nI designed REST APIs.\n\nYours faithfully,\nJane Doe',
  warnings: [],
  note: 'ai-unusable',
  jobLanguage: 'en',
  createdAt: '2026-10-20T10:00:00Z',
  facts: [
    { id: 'F1', type: 'EXPERIENCE', text: 'Designed REST APIs with Spring Boot', title: 'Java Developer', company: 'Northwind', period: '2019-01/present', skills: ['Java'] },
  ],
  paragraphFacts: [[], ['F1'], []],
};

const summary = (id: string) => [{ id, version: 1, source: 'GENERATED', generator: 'template', language: 'en', createdAt: letter.createdAt }];

function setup(kind: 'LETTER' | 'EMAIL', recipient: string | null = null) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  TestBed.inject(I18n).use('en');
  const fixture = TestBed.createComponent(DocWorkspace);
  fixture.componentRef.setInput('kind', kind);
  fixture.componentRef.setInput('jobId', 'j1');
  fixture.componentRef.setInput('cvId', 'cv1');
  fixture.componentRef.setInput('recipient', recipient);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

describe('DocWorkspace', () => {
  it('asks for a CV before writing anything', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(DocWorkspace);
    fixture.componentRef.setInput('kind', 'LETTER');
    fixture.componentRef.setInput('jobId', 'j1');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Choose a CV to write from.');
  });

  it('shows an empty state, then the generated draft with its evidence and why the template was used', () => {
    const { fixture, http, el } = setup('LETTER');
    http.expectOne((r) => r.url === '/api/jobs/j1/documents' && r.params.get('type') === 'LETTER').flush([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('No draft yet');

    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/jobs/j1/letters');
    expect(req.request.body).toMatchObject({ cvId: 'cv1', language: null, tone: 'NEUTRAL', length: 'STANDARD', formality: 'FORMAL', useAi: true });
    req.flush(letter);
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush(summary('d1'));
    fixture.detectChanges();

    expect((el().querySelector('#d-body') as HTMLTextAreaElement).value).toContain('I designed REST APIs.');
    expect(el().textContent).toContain('Evidence from your CV');
    expect(el().textContent).toContain('Designed REST APIs with Spring Boot');
    expect(el().textContent).toContain('The language model gave no usable answer, so the template was used.');
    expect(el().textContent).toContain('you stay responsible');
  });

  it('saves edits as a new version and shows warnings for claims that are not in the CV', () => {
    const { fixture, http, el } = setup('LETTER');
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush(summary('d1'));
    http.expectOne('/api/documents/d1').flush(letter);
    fixture.detectChanges();

    const area = el().querySelector('#d-body') as HTMLTextAreaElement;
    const save = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Save as a new version')) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    area.value = 'I increased revenue by 95%.';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(save.disabled).toBe(false);

    save.click();
    const put = http.expectOne('/api/documents/d1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.text).toBe('I increased revenue by 95%.');
    put.flush({ ...letter, id: 'd2', version: 2, source: 'EDITED', body: 'I increased revenue by 95%.', warnings: ['95'] });
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush([]);
    fixture.detectChanges();

    expect(el().textContent).toContain('Saved as version 2.');
    expect(el().textContent).toContain('do not appear in your CV');
    expect(el().textContent).toContain('95');
  });

  it('offers a mailto link only when a published recipient was chosen, and states that nothing is sent', () => {
    const email: DocView = { ...letter, id: 'e1', type: 'EMAIL', subject: 'Application: Java Developer', body: 'Hello,\n\nMy CV is attached.' };
    const { fixture, http, el } = setup('EMAIL', 'careers@acme-corp.io');
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush(summary('e1'));
    http.expectOne('/api/documents/e1').flush(email);
    fixture.detectChanges();

    const mail = Array.from(el().querySelectorAll('a')).find((a) => a.textContent?.includes('Open in my email app'));
    expect(mail?.getAttribute('href')).toBe('mailto:careers@acme-corp.io?subject=Application%3A%20Java%20Developer&body=Hello%2C%0A%0AMy%20CV%20is%20attached.');
    expect(el().textContent).toContain('Nothing is sent from here');
    expect(el().textContent).toContain('careers@acme-corp.io');
  });

  it('tells the user when the offer is in a language that is not supported yet', () => {
    const { fixture, http, el } = setup('LETTER');
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush(summary('d1'));
    http.expectOne('/api/documents/d1').flush({ ...letter, jobLanguage: 'de' });
    fixture.detectChanges();

    expect(el().textContent).toContain('written in German, which is not supported yet');
    expect(el().textContent).toContain('This draft is in English');
  });

  it('does not offer a mailto link without a recipient', () => {
    const email: DocView = { ...letter, id: 'e1', type: 'EMAIL', subject: 'S', body: 'B' };
    const { fixture, http, el } = setup('EMAIL', null);
    http.expectOne((r) => r.url === '/api/jobs/j1/documents').flush(summary('e1'));
    http.expectOne('/api/documents/e1').flush(email);
    fixture.detectChanges();

    expect(Array.from(el().querySelectorAll('a')).some((a) => a.textContent?.includes('Open in my email app'))).toBe(false);
    expect(el().textContent).toContain('No recipient chosen');
  });
});
