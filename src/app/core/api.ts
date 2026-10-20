import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: 'en' | 'fr';
}

export interface SkillEntry {
  name: string;
  category: string | null;
  evidence: string | null;
}

export interface Experience {
  title: string | null;
  company: string | null;
  start: string | null;
  end: string | null;
  current: boolean;
  bullets: string[];
}

export interface Education {
  degree: string | null;
  institution: string | null;
  start: string | null;
  end: string | null;
}

export interface LanguageLevel {
  language: string | null;
  level: string | null;
}

export interface ParsedCv {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: SkillEntry[];
  experience: Experience[];
  education: Education[];
  languages: LanguageLevel[];
  certifications: string[];
  projects: string[];
  yearsOfExperience: number | null;
}

export interface CvSummary {
  id: string;
  label: string;
  sourceType: 'PDF' | 'DOCX' | 'TEXT';
  originalFilename: string | null;
  language: string | null;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CvDetail {
  summary: CvSummary;
  parsed: ParsedCv;
  text: string;
}

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Finding {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  suggestion: string;
  evidence: string[];
}

export interface Analysis {
  id: string;
  createdAt: string;
  overallScore: number;
  report: {
    overallScore: number;
    language: string | null;
    wordCount: number;
    findings: Finding[];
    skillInventory: Record<string, string[]>;
    strengths: string[];
    gaps: string[];
  };
  aiReview: {
    status: 'ok' | 'unavailable' | 'unusable-output' | 'skipped';
    provider: string;
    issues: { quote: string; problem: string; suggestion: string }[];
  };
}

export interface Preferences {
  desiredTitles: string[];
  desiredTechnologies: string[];
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  contractTypes: string[];
  workModes: string[];
  preferredCountries: string[];
  preferredLocations: string[];
  willingToRelocate: boolean;
  needsVisaSponsorship: boolean | null;
  workAuthorization: string[];
  notifyNewMatches: boolean;
  notifyReminders: boolean;
}

export type RemoteMode = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';

export interface JobSummary {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  country: string | null;
  remoteMode: RemoteMode;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  postedAt: string | null;
  validThrough: string | null;
  sourceKey: string;
  sourceName: string;
  url: string;
  applyUrl: string | null;
  status: 'ACTIVE' | 'EXPIRED';
  language: string | null;
  snippet: string;
  submittedByYou: boolean;
  matchScore: number | null;
  matchCoverage: number | null;
}

export interface MatchNote {
  code: string;
  params: Record<string, string | number | boolean | null>;
}

export interface MatchComponent {
  key: string;
  weight: number;
  score: number | null;
  detail: MatchNote;
  confidence: number;
}

export interface MatchSkill {
  skill: string;
  level: 'REQUIRED' | 'PREFERRED';
  inferred: boolean;
  matched: boolean;
  evidence: string | null;
  mentions: number;
}

export interface MatchReport {
  score: number | null;
  coverage: number;
  insufficientData: boolean;
  components: MatchComponent[];
  skills: MatchSkill[];
  strengths: MatchNote[];
  gaps: MatchNote[];
  relevantExperience: {
    title: string | null;
    company: string | null;
    start: string | null;
    end: string | null;
    current: boolean;
    quote: string | null;
    skills: string[];
  }[];
  blockers: MatchNote[];
  cvAdjustments: MatchNote[];
  learningPriorities: { skill: string; level: 'REQUIRED' | 'PREFERRED'; mentions: number }[];
  cvReviewed: boolean;
}

export interface MatchView {
  jobId: string;
  cvId: string;
  report: MatchReport;
  weights: Record<string, number>;
}

export interface MatchRunSummary {
  total: number;
  computed: number;
  reused: number;
  scored: number;
}

export interface JobDetail {
  summary: JobSummary;
  description: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt: string | null;
  sourceTermsUrl: string | null;
  warnings: QualityWarning[];
}

export interface QualityWarning {
  code: string;
  severity: 'CAUTION' | 'NOTE';
  evidence: string | null;
}

export interface JobPage {
  items: JobSummary[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface JobFilter {
  q: string;
  location: string;
  remote: '' | RemoteMode;
  sort: 'newest' | 'deadline' | 'salary' | 'company' | 'match';
  cvId: string | null;
  minScore: number | null;
  postedWithinDays: number | null;
  minSalary: number | null;
  includeUnknownSalary: boolean;
  includeExpired: boolean;
  page: number;
}

export interface SourceView {
  key: string;
  name: string;
  enabled: boolean;
  disabledReason: string | null;
  termsUrl: string;
  state: 'healthy' | 'degraded' | 'failing' | 'unused' | 'disabled';
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  lastItemCount: number | null;
  activeOffers: number;
}

export interface RunResult {
  sources: { source: string; fetched: number; created: number; updated: number; duplicates: number; error: string | null }[];
  created: number;
  updated: number;
  duplicates: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  keywords: string | null;
  location: string | null;
  remoteOnly: boolean;
  sourceKeys: string[];
  autoRun: boolean;
  intervalHours: number;
  minScore: number;
  lastRunAt: string | null;
  lastNewCount: number | null;
}

export interface AppNotification {
  id: string;
  type: 'NEW_MATCHES' | 'REMINDER_DUE' | 'INTERVIEW_SOON';
  code: string;
  params: Record<string, unknown>;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface SearchRequest {
  keywords: string;
  location: string;
  remoteOnly: boolean;
  sourceKeys: string[];
}

export type Tone = 'NEUTRAL' | 'WARM' | 'DIRECT';
export type Length = 'SHORT' | 'STANDARD' | 'DETAILED';
export type Formality = 'FORMAL' | 'STANDARD';

export interface Fact {
  id: string;
  type: 'EXPERIENCE' | 'SKILL' | 'YEARS' | 'EDUCATION' | 'LANGUAGE';
  text: string;
  title: string | null;
  company: string | null;
  period: string | null;
  skills: string[];
}

export interface DocView {
  id: string;
  jobId: string;
  type: 'LETTER' | 'EMAIL';
  language: string;
  version: number;
  source: 'GENERATED' | 'EDITED';
  generator: string;
  subject: string | null;
  body: string;
  facts: Fact[];
  paragraphFacts: string[][];
  warnings: string[];
  note: string | null;
  jobLanguage: string | null;
  createdAt: string;
}

export interface DocSummary {
  id: string;
  version: number;
  source: 'GENERATED' | 'EDITED';
  generator: string;
  language: string;
  createdAt: string;
}

export interface LetterRequest {
  cvId: string;
  language: string | null;
  tone: Tone;
  length: Length;
  formality: Formality;
  useAi: boolean;
}

export interface EmailRequest {
  cvId: string;
  language: string | null;
  formality: Formality;
  includeLetter: boolean;
  contactName: string | null;
}

export interface ContactView {
  id: string;
  kind: 'EMAIL' | 'PERSON' | 'URL';
  value: string;
  name: string | null;
  title: string | null;
  sourceUrl: string;
  sourceKind: 'AD_TEXT' | 'OFFICIAL_PAGE';
  verified: boolean;
  discoveredAt: string;
}

export interface ContactsView {
  contacts: ContactView[];
  applyUrl: string | null;
  jobUrl: string;
  searched: boolean;
  searchedAt: string | null;
  pagesRead: number;
  note: string | null;
  hasEmail: boolean;
}

export type AppStatus =
  | 'DISCOVERED'
  | 'TO_REVIEW'
  | 'SHORTLISTED'
  | 'PREPARING'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export const OPEN_STATUSES: AppStatus[] = ['DISCOVERED', 'TO_REVIEW', 'SHORTLISTED', 'PREPARING', 'APPLIED', 'INTERVIEW', 'ASSESSMENT', 'OFFER'];
export const CLOSED_STATUSES: AppStatus[] = ['REJECTED', 'WITHDRAWN'];

export interface AppSummary {
  id: string;
  jobId: string | null;
  title: string;
  company: string | null;
  location: string | null;
  jobUrl: string | null;
  status: AppStatus;
  appliedAt: string | null;
  deadlineAt: string | null;
  statusChangedAt: string;
  createdAt: string;
  nextInterviewAt: string | null;
  nextReminderAt: string | null;
  openReminders: number;
  overdueReminders: number;
  allowedNext: AppStatus[];
}

export interface AppReminder {
  id: string;
  applicationId: string;
  applicationTitle: string | null;
  dueAt: string;
  text: string;
  doneAt: string | null;
  overdue: boolean;
}

export interface AppDetail {
  summary: AppSummary;
  cvId: string | null;
  notes: string | null;
  allowedNext: AppStatus[];
  timeline: { id: string; type: string; from: AppStatus | null; to: AppStatus | null; note: string | null; occurredAt: string }[];
  contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null; note: string | null }[];
  interviews: { id: string; kind: string; scheduledAt: string; durationMinutes: number; location: string | null; notes: string | null }[];
  reminders: AppReminder[];
  attachments: { id: string; kind: 'DOCUMENT' | 'LINK'; documentId: string | null; label: string; url: string | null }[];
}

export interface DuplicateApp {
  id: string;
  title: string;
  company: string | null;
  status: AppStatus;
  createdAt: string;
  sameOffer: boolean;
}

export interface AppDashboard {
  byStatus: Record<AppStatus, number>;
  total: number;
  dueReminders: AppReminder[];
  upcomingInterviews: { applicationId: string; applicationTitle: string; company: string | null; kind: string; scheduledAt: string; location: string | null }[];
}

export interface CreateApplication {
  jobId?: string | null;
  title?: string;
  company?: string;
  location?: string;
  jobUrl?: string;
  status?: AppStatus;
  cvId?: string | null;
  confirmDuplicate?: boolean;
}

export interface AnalyticsCount {
  key: string;
  count: number;
}

export interface Analytics {
  overview: {
    tracked: number;
    applied: number;
    interviews: number;
    offers: number;
    rejectedAfterApplying: number;
    waiting: number;
    withdrawn: number;
    interviewRate: number | null;
    offerRate: number | null;
    smallSample: boolean;
    smallSampleBelow: number;
  };
  byStatus: AnalyticsCount[];
  byCountry: AnalyticsCount[];
  byRole: AnalyticsCount[];
  skills: AnalyticsCount[];
  timePerStage: { status: AppStatus; visits: number; averageDays: number | null }[];
  byCv: { cvId: string; label: string; applied: number; interviews: number; interviewRate: number | null }[];
  bestCvId: string | null;
  bestCvNote: 'NOT_ENOUGH_DATA' | 'NO_CLEAR_DIFFERENCE' | 'LEADS_BY_SMALL_SAMPLE';
}

export interface CvReadability {
  words: number;
  bullets: number;
  averageBulletWords: number;
  quantifiedBulletShare: number;
  longBullets: number;
  hasSummary: boolean;
  hasSkills: boolean;
  hasEducation: boolean;
  experienceEntries: number;
}

export interface CvSide {
  cvId: string;
  label: string;
  readability: CvReadability;
  coverage: {
    required: number;
    requiredCovered: number;
    preferred: number;
    preferredCovered: number;
    missingRequired: string[];
    missingPreferred: string[];
  } | null;
  matchScore: number | null;
}

export interface CvComparison {
  a: CvSide;
  b: CvSide;
  job: { id: string; title: string; company: string | null } | null;
  differences: { code: string; subject: string | null; a: string | null; b: string | null }[];
  skillsOnlyInA: string[];
  skillsOnlyInB: string[];
}

export interface LearningResource {
  title: string;
  url: string;
  provider: string;
  kind: string;
  language: string;
}

export interface LearningPlan {
  jobsConsidered: number;
  items: { skill: string; jobs: number; requiredIn: number; preferredIn: number; resources: LearningResource[] }[];
}

export interface InterviewQuestion {
  id: string;
  kind: 'EXPERIENCE' | 'GAP' | 'BEHAVIORAL' | 'MOTIVATION' | 'ASK_THEM';
  skill: string | null;
  text: string;
  evidence: string | null;
  weakEvidence: boolean;
  scaffold: string[];
}

export interface InterviewPrep {
  jobId: string;
  title: string;
  company: string | null;
  language: string;
  cvReviewed: boolean;
  questions: InterviewQuestion[];
  revision: { skill: string; level: string; shownOnCv: boolean; resources: LearningResource[] }[];
}

export interface CompanyProfile {
  company: string | null;
  named: boolean;
  openOffers: number;
  bySource: Record<string, number>;
  byCountry: Record<string, number>;
  firstSeenAt: string | null;
  offersWithWarnings: number;
  offers: { id: string; title: string; location: string | null; sourceKey: string; firstSeenAt: string }[];
  yourHistory: { applications: number; byStatus: Record<string, number> };
}

export interface SystemStatus {
  api: string;
  ai: { provider: string; available: boolean; detail: string };
}

/** RFC 9457 problem body returned by the API. */
export interface Problem {
  title?: string;
  detail?: string;
  fields?: Record<string, string>;
}

export function problemMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'The server cannot be reached. Check that the API is running.';
    }
    const p = err.error as Problem | null;
    if (p?.fields) {
      return Object.entries(p.fields)
        .map(([f, m]) => `${f}: ${m}`)
        .join(' · ');
    }
    if (p?.detail) {
      return p.detail;
    }
    if (err.status === 429) {
      return 'Too many requests. Please wait a moment.';
    }
  }
  return fallback;
}

/** The existing applications behind a 409 "you already track this role" answer, or null for any other error. */
export function duplicateDetails(err: unknown): DuplicateApp[] | null {
  if (err instanceof HttpErrorResponse && err.status === 409) {
    const body = err.error as { code?: string; details?: DuplicateApp[] } | null;
    if (body?.code === 'duplicate-application' && Array.isArray(body.details)) {
      return body.details;
    }
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  status(): Observable<SystemStatus> {
    return this.http.get<SystemStatus>('/api/status');
  }

  // auth
  register(body: {
    email: string;
    password: string;
    displayName: string;
    preferredLanguage: string;
    consent: boolean;
  }): Observable<User> {
    return this.http.post<User>('/api/auth/register', body);
  }
  login(body: { email: string; password: string }): Observable<User> {
    return this.http.post<User>('/api/auth/login', body);
  }
  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {});
  }
  me(): Observable<User> {
    return this.http.get<User>('/api/auth/me');
  }

  // CVs
  listCvs(): Observable<CvSummary[]> {
    return this.http.get<CvSummary[]>('/api/cvs');
  }
  uploadCv(file: File, label: string): Observable<CvDetail> {
    const form = new FormData();
    form.append('file', file);
    if (label.trim()) {
      form.append('label', label.trim());
    }
    return this.http.post<CvDetail>('/api/cvs', form);
  }
  createCvFromText(label: string, text: string): Observable<CvDetail> {
    return this.http.post<CvDetail>('/api/cvs/text', { label, text });
  }
  getCv(id: string): Observable<CvDetail> {
    return this.http.get<CvDetail>(`/api/cvs/${id}`);
  }
  saveCv(id: string, label: string, parsed: ParsedCv): Observable<CvDetail> {
    return this.http.put<CvDetail>(`/api/cvs/${id}/profile`, { label, parsed });
  }
  deleteCv(id: string): Observable<void> {
    return this.http.delete<void>(`/api/cvs/${id}`);
  }
  analyze(id: string, ai: boolean): Observable<Analysis> {
    return this.http.post<Analysis>(`/api/cvs/${id}/analysis?ai=${ai}`, {});
  }
  latestAnalysis(id: string): Observable<Analysis> {
    return this.http.get<Analysis>(`/api/cvs/${id}/analysis`);
  }
  exportCvMarkdown(id: string): Observable<string> {
    return this.http.get(`/api/cvs/${id}/export.md`, { responseType: 'text' });
  }

  // jobs
  listJobs(f: JobFilter): Observable<JobPage> {
    const p: Record<string, string> = { sort: f.sort, page: String(f.page), size: '20' };
    if (f.q.trim()) p['q'] = f.q.trim();
    if (f.location.trim()) p['location'] = f.location.trim();
    if (f.remote) p['remote'] = f.remote;
    if (f.postedWithinDays) p['postedWithinDays'] = String(f.postedWithinDays);
    if (f.minSalary) {
      p['minSalary'] = String(f.minSalary);
      p['includeUnknownSalary'] = String(f.includeUnknownSalary);
    }
    if (f.includeExpired) p['includeExpired'] = 'true';
    if (f.cvId) {
      p['cvId'] = f.cvId;
      if (f.minScore) p['minScore'] = String(f.minScore);
    }
    return this.http.get<JobPage>('/api/jobs', { params: p });
  }
  // application tracker
  applications(status?: AppStatus): Observable<AppSummary[]> {
    return this.http.get<AppSummary[]>('/api/applications', { params: status ? { status } : {} });
  }
  appDashboard(): Observable<AppDashboard> {
    return this.http.get<AppDashboard>('/api/applications/dashboard');
  }
  appCheck(jobId: string): Observable<DuplicateApp[]> {
    return this.http.get<DuplicateApp[]>('/api/applications/check', { params: { jobId } });
  }
  createApplication(body: CreateApplication): Observable<AppDetail> {
    return this.http.post<AppDetail>('/api/applications', body);
  }
  application(id: string): Observable<AppDetail> {
    return this.http.get<AppDetail>(`/api/applications/${id}`);
  }
  updateApplication(id: string, body: Record<string, unknown>): Observable<AppDetail> {
    return this.http.put<AppDetail>(`/api/applications/${id}`, body);
  }
  deleteApplication(id: string): Observable<void> {
    return this.http.delete<void>(`/api/applications/${id}`);
  }
  moveApplication(id: string, status: AppStatus, note: string | null, followUpDays: number | null): Observable<AppDetail> {
    return this.http.post<AppDetail>(`/api/applications/${id}/status`, { status, note, followUpDays });
  }
  addAppItem(id: string, path: 'notes' | 'contacts' | 'interviews' | 'reminders' | 'attachments', body: Record<string, unknown>): Observable<AppDetail> {
    return this.http.post<AppDetail>(`/api/applications/${id}/${path}`, body);
  }
  removeAppItem(id: string, path: 'contacts' | 'interviews' | 'reminders' | 'attachments', itemId: string): Observable<AppDetail> {
    return this.http.delete<AppDetail>(`/api/applications/${id}/${path}/${itemId}`);
  }
  completeReminder(id: string, reminderId: string, done: boolean): Observable<AppDetail> {
    return this.http.post<AppDetail>(`/api/applications/${id}/reminders/${reminderId}/done`, { done });
  }
  calendar(applicationId?: string): Observable<Blob> {
    return this.http.get('/api/applications/calendar.ics', { params: applicationId ? { applicationId } : {}, responseType: 'blob' });
  }

  // documents and contacts
  createLetter(jobId: string, body: LetterRequest): Observable<DocView> {
    return this.http.post<DocView>(`/api/jobs/${jobId}/letters`, body);
  }
  createEmail(jobId: string, body: EmailRequest): Observable<DocView> {
    return this.http.post<DocView>(`/api/jobs/${jobId}/emails`, body);
  }
  documentVersions(jobId: string, type: 'LETTER' | 'EMAIL'): Observable<DocSummary[]> {
    return this.http.get<DocSummary[]>(`/api/jobs/${jobId}/documents`, { params: { type } });
  }
  getDocument(id: string): Observable<DocView> {
    return this.http.get<DocView>(`/api/documents/${id}`);
  }
  editDocument(id: string, text: string, subject: string | null): Observable<DocView> {
    return this.http.put<DocView>(`/api/documents/${id}`, { text, subject });
  }
  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`);
  }
  exportDocument(id: string, format: string, to: string | null): Observable<Blob> {
    const params: Record<string, string> = { format };
    if (to) params['to'] = to;
    return this.http.get(`/api/documents/${id}/export`, { params, responseType: 'blob' });
  }
  getContacts(jobId: string): Observable<ContactsView> {
    return this.http.get<ContactsView>(`/api/jobs/${jobId}/contacts`);
  }
  discoverContacts(jobId: string): Observable<ContactsView> {
    return this.http.post<ContactsView>(`/api/jobs/${jobId}/contacts/discover`, {});
  }

  runMatches(cvId: string): Observable<MatchRunSummary> {
    return this.http.post<MatchRunSummary>('/api/matches/run', { cvId });
  }
  getMatch(jobId: string, cvId: string): Observable<MatchView> {
    return this.http.get<MatchView>(`/api/jobs/${jobId}/match`, { params: { cvId } });
  }
  getJob(id: string): Observable<JobDetail> {
    return this.http.get<JobDetail>(`/api/jobs/${id}`);
  }
  importJob(url: string): Observable<JobDetail> {
    return this.http.post<JobDetail>('/api/jobs/import', { url });
  }
  sources(): Observable<SourceView[]> {
    return this.http.get<SourceView[]>('/api/sources');
  }
  runSearch(body: SearchRequest): Observable<RunResult> {
    return this.http.post<RunResult>('/api/searches/run', body);
  }
  savedSearches(): Observable<SavedSearch[]> {
    return this.http.get<SavedSearch[]>('/api/searches');
  }
  saveSearch(name: string, body: SearchRequest, autoRun: boolean, intervalHours: number, minScore = 60): Observable<SavedSearch> {
    return this.http.post<SavedSearch>('/api/searches', { name, ...body, autoRun, intervalHours, minScore });
  }
  compareCvs(a: string, b: string, jobId: string | null): Observable<CvComparison> {
    const params: Record<string, string> = { a, b };
    if (jobId) {
      params['jobId'] = jobId;
    }
    return this.http.get<CvComparison>('/api/cv-comparison', { params });
  }
  learningPlan(cvId: string): Observable<LearningPlan> {
    return this.http.get<LearningPlan>('/api/learning/plan', { params: { cvId } });
  }
  getInterviewPrep(jobId: string, cvId: string, lang: string): Observable<InterviewPrep> {
    return this.http.get<InterviewPrep>(`/api/jobs/${jobId}/interview-prep`, { params: { cvId, lang } });
  }
  getCompany(jobId: string): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`/api/jobs/${jobId}/company`);
  }
  analytics(): Observable<Analytics> {
    return this.http.get<Analytics>('/api/analytics');
  }
  notifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>('/api/notifications');
  }
  unreadNotifications(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>('/api/notifications/unread-count');
  }
  markNotificationRead(id: string): Observable<void> {
    return this.http.post<void>(`/api/notifications/${id}/read`, {});
  }
  markAllNotificationsRead(): Observable<{ marked: number }> {
    return this.http.post<{ marked: number }>('/api/notifications/read-all', {});
  }
  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`/api/notifications/${id}`);
  }
  runSavedSearch(id: string): Observable<RunResult> {
    return this.http.post<RunResult>(`/api/searches/${id}/run`, {});
  }
  deleteSavedSearch(id: string): Observable<void> {
    return this.http.delete<void>(`/api/searches/${id}`);
  }

  // profile & account
  getPreferences(): Observable<Preferences> {
    return this.http.get<Preferences>('/api/profile');
  }
  savePreferences(p: Preferences): Observable<Preferences> {
    return this.http.put<Preferences>('/api/profile', p);
  }
  exportAccount(): Observable<unknown> {
    return this.http.get('/api/account/export');
  }
  deleteAccount(password: string): Observable<void> {
    return this.http.request<void>('DELETE', '/api/account', { body: { password } });
  }
}
