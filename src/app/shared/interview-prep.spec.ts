import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InterviewPrep } from '../core/api';
import { InterviewPrepPanel } from './interview-prep';

const PREP: InterviewPrep = {
  jobId: 'j1',
  title: 'Java Developer',
  company: 'Acme',
  language: 'en',
  cvReviewed: true,
  questions: [
    { id: 'q1', kind: 'EXPERIENCE', skill: 'Java', text: 'Tell me about a project where you used Java.', evidence: 'Designed REST APIs', weakEvidence: false, scaffold: ['Situation: x'] },
    { id: 'q2', kind: 'GAP', skill: 'Docker', text: 'The ad asks for Docker.', evidence: null, weakEvidence: false, scaffold: ['Say plainly'] },
  ],
  revision: [{ skill: 'Docker', level: 'REQUIRED', shownOnCv: false, resources: [{ title: 'Docker get started', url: 'https://docs.docker.com/get-started/', provider: 'Docker', kind: 'tutorial', language: 'en' }] }],
};

describe('InterviewPrepPanel', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(InterviewPrepPanel);
    fixture.componentRef.setInput('jobId', 'j1');
    fixture.componentRef.setInput('cvId', 'cv1');
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/jobs/j1/interview-prep' && r.params.get('cvId') === 'cv1').flush(PREP);
    await fixture.whenStable();
    return fixture;
  }

  it('shows the CV quote as evidence only where the CV has it, and links the revision topics', async () => {
    const el = (await setup()).nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('Designed REST APIs');
    expect(text).toContain('Say plainly');
    expect(el.querySelectorAll('blockquote').length).toBe(1);
    expect(el.querySelector('a[href="https://docs.docker.com/get-started/"]')).not.toBeNull();
  });

  it('runs a mock interview one question at a time and lists what needs work', async () => {
    const fixture = await setup();
    const el = fixture.nativeElement as HTMLElement;
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('mock')) as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Question 1 of 2');
    expect(el.textContent).not.toContain('The ad asks for Docker.');
    const rate = (label: string) => (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement).click();
    rate('Confident');
    await fixture.whenStable();
    expect(el.textContent).toContain('Question 2 of 2');
    rate('Needs work');
    await fixture.whenStable();
    expect(el.textContent).toContain('Mock interview finished');
    expect(el.textContent).toContain('The ad asks for Docker.');
    TestBed.inject(HttpTestingController).verify();
  });
});
