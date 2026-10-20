import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { MatchView } from '../core/api';
import { I18n } from '../core/i18n';
import { MatchReportView } from './match-report';

const view: MatchView = {
  jobId: 'j1',
  cvId: 'c1',
  weights: { requiredSkills: 30 },
  report: {
    score: 82,
    coverage: 70,
    insufficientData: false,
    components: [
      { key: 'requiredSkills', weight: 30, score: 1, detail: { code: 'required.some', params: { matched: 3, total: 3 } }, confidence: 0.5 },
      { key: 'contractSalary', weight: 5, score: null, detail: { code: 'contract.unknown', params: {} }, confidence: 1 },
      { key: 'experience', weight: 15, score: 0.8, detail: { code: 'experience.seniority', params: { job: 'senior', you: 'lead' } }, confidence: 1 },
    ],
    skills: [
      { skill: 'Java', level: 'REQUIRED', inferred: false, matched: true, evidence: 'Listed in skills section', mentions: 2 },
      { skill: 'Kafka', level: 'PREFERRED', inferred: true, matched: false, evidence: null, mentions: 1 },
    ],
    strengths: [{ code: 'strength.requiredSkills', params: { matched: 3, total: 3, skills: 'Java' } }],
    gaps: [{ code: 'gap.preferredSkills', params: { count: 1, skills: 'Kafka' } }],
    relevantExperience: [],
    blockers: [{ code: 'blocker.visa', params: {} }],
    cvAdjustments: [{ code: 'adjust.missingRequired', params: { skill: 'Kafka' } }],
    learningPriorities: [{ skill: 'Kafka', level: 'PREFERRED', mentions: 1 }],
    cvReviewed: false,
  },
};

function render(part: 'analysis' | 'cv', lang: 'en' | 'fr') {
  TestBed.configureTestingModule({ imports: [MatchReportView], providers: [provideRouter([])] });
  TestBed.inject(I18n).use(lang);
  const fixture = TestBed.createComponent(MatchReportView);
  fixture.componentRef.setInput('view', view);
  fixture.componentRef.setInput('part', part);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('MatchReportView', () => {
  afterEach(() => TestBed.inject(I18n).use('en'));

  it('explains the score, skips unknown criteria and states the disclaimer', () => {
    const text = render('analysis', 'en');
    expect(text).toContain('82');
    expect(text).toContain('Based on 70% of the criteria');
    expect(text).toContain('3 of 3 required skills are on your CV.');
    expect(text).toContain('Not evaluated');
    expect(text).toContain('Counts for less');
    expect(text).toContain('not a prediction of being hired');
    expect(text).toContain('The ad says it does not sponsor visas');
    expect(text).toContain('has not been reviewed yet');
  });

  it('translates levels inside notes and renders in French', () => {
    const text = render('analysis', 'fr');
    expect(text).toContain("Niveau de l'offre : Senior. Votre niveau : Lead.");
    expect(text).toContain('Ce n\'est pas une prédiction d\'embauche');
  });

  it('shows CV adjustments as suggestions and learning priorities on the CV tab', () => {
    const text = render('cv', 'en');
    expect(text).toContain('Add it only if you have really used it');
    expect(text).toContain('Kafka: preferred, mentioned 1×');
    expect(text).toContain('Nothing changes until you edit your profile yourself');
  });
});
