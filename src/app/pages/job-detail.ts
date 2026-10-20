import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, ContactView, CvSummary, JobDetail, MatchView, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { CompanyPanel } from '../shared/company-panel';
import { InterviewPrepPanel } from '../shared/interview-prep';
import { SelectedCv } from '../core/selected-cv';
import { formatSalary, safeUrl } from '../shared/format';
import { ContactsPanel } from '../shared/contacts-panel';
import { DocWorkspace } from '../shared/doc-workspace';
import { MatchReportView } from '../shared/match-report';
import { TrackButton } from '../shared/track-button';

type Tab = 'description' | 'match' | 'cv' | 'letter' | 'contact' | 'email' | 'interview';

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, DatePipe, MatchReportView, DocWorkspace, ContactsPanel, TrackButton, InterviewPrepPanel, CompanyPanel],
  styles: `
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px 24px; margin: 0; }
    .facts div { display: grid; gap: 2px; }
    .facts dt { font: 500 12px var(--mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    .facts dd { margin: 0; overflow-wrap: anywhere; }
    .desc { white-space: pre-wrap; overflow-wrap: anywhere; max-width: 75ch; line-height: 1.7; }
    .tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--line); }
    .tabs button { border: 0; background: transparent; color: var(--muted); font: 500 14px var(--body); padding: 10px 14px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tabs button[aria-selected='true'] { color: var(--accent); border-bottom-color: var(--accent); }
    .cvpick { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
    .cvpick select { width: auto; min-width: 200px; max-width: 100%; }
  `,
  template: `
    @if (error()) {
      <p class="banner error" role="alert">{{ error() }}</p>
    } @else if (job(); as j) {
      <div class="stack">
        <div class="stack-sm">
          <a routerLink="/app/jobs" class="muted">← {{ i18n.t('jobs.detail.back') }}</a>
          <h1>{{ j.summary.title }}</h1>
          <div class="row">
            <span class="chip" [class.accent]="j.summary.remoteMode === 'REMOTE'" [class.neutral]="j.summary.remoteMode !== 'REMOTE'">{{ i18n.t(rm(j.summary.remoteMode)) }}</span>
            @if (j.summary.status === 'EXPIRED') { <span class="chip high">{{ i18n.t('jobs.card.expired') }}</span> }
            @if (j.summary.submittedByYou) { <span class="chip neutral">{{ i18n.t('jobs.card.yours') }}</span> }
          </div>
        </div>

        @if (j.summary.status === 'EXPIRED') { <p class="banner attn">{{ i18n.t('jobs.detail.expiredNote') }}</p> }

        @if (j.warnings.length > 0) {
          <section class="banner attn warnings" aria-labelledby="warn-h">
            <h2 id="warn-h">{{ i18n.t('warn.title') }}</h2>
            <p>{{ i18n.t('warn.lede') }}</p>
            <ul>
              @for (w of j.warnings; track w.code) {
                <li>
                  <strong>{{ i18n.t(warnKey(w.code)) }}</strong>
                  @if (w.evidence) { <q>{{ w.evidence }}</q> }
                </li>
              }
            </ul>
          </section>
        }

        <section class="card">
          <dl class="facts">
            <div><dt>{{ i18n.t('review.company') }}</dt><dd>{{ j.summary.company || i18n.t('common.unknown') }}</dd></div>
            <div><dt>{{ i18n.t('jobs.location') }}</dt><dd>{{ j.summary.location || i18n.t('common.unknown') }}{{ j.summary.country ? ' (' + j.summary.country + ')' : '' }}</dd></div>
            <div><dt>{{ i18n.t('pref.salary') }}</dt><dd>{{ salary(j) ?? i18n.t('jobs.card.salaryUnknown') }}</dd></div>
            <div><dt>{{ i18n.t('pref.contracts') }}</dt><dd>{{ j.summary.employmentType || i18n.t('common.unknown') }}</dd></div>
            <div><dt>{{ i18n.t('jobs.card.posted', { date: '' }) }}</dt><dd>{{ j.summary.postedAt ? (j.summary.postedAt | date: 'mediumDate') : i18n.t('jobs.card.postedUnknown') }}</dd></div>
            <div><dt>{{ i18n.t('jobs.sort.deadline') }}</dt><dd>{{ j.summary.validThrough ? (j.summary.validThrough | date: 'mediumDate') : i18n.t('common.unknown') }}</dd></div>
            <div><dt>{{ i18n.t('jobs.detail.source') }}</dt><dd>{{ j.summary.sourceName }}</dd></div>
          </dl>
          <app-track-button [jobId]="id()" />
          <div class="row">
            @if (link(j.summary.applyUrl || j.summary.url); as href) {
              <a class="btn primary" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('jobs.detail.apply') }} ↗</a>
            }
            @if (link(j.summary.url); as href) {
              <a class="btn" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('jobs.detail.original') }} ↗</a>
            }
            @if (link(j.sourceTermsUrl); as href) {
              <a class="btn ghost" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('jobs.health.terms') }} ↗</a>
            }
          </div>
          <p class="hint">
            {{ i18n.t('jobs.detail.firstSeen', { date: (j.firstSeenAt | date: 'medium') ?? '' }) }} ·
            {{ j.lastVerifiedAt ? i18n.t('jobs.detail.verified', { date: (j.lastVerifiedAt | date: 'medium') ?? '' }) : i18n.t('jobs.detail.notVerified') }}
          </p>
        </section>

        <div class="tabs" role="tablist">
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'description'" (click)="tab.set('description')">{{ i18n.t('tab.description') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'match'" (click)="open('match')">{{ i18n.t('tab.match') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'cv'" (click)="open('cv')">{{ i18n.t('tab.cv') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'letter'" (click)="tab.set('letter')">{{ i18n.t('tab.letter') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'contact'" (click)="tab.set('contact')">{{ i18n.t('tab.contact') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'email'" (click)="tab.set('email')">{{ i18n.t('tab.email') }}</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'interview'" (click)="tab.set('interview')">{{ i18n.t('tab.interview') }}</button>
        </div>

        @if (tab() === 'description') {
          <section class="card">
            <h2>{{ i18n.t('jobs.detail.description') }}</h2>
            <div class="desc">{{ j.description }}</div>
            <p class="hint">{{ i18n.t('jobs.detail.disclaimer') }}</p>
          </section>
          <app-company-panel [jobId]="id()" />
        } @else if (tab() === 'contact') {
          <app-contacts-panel [jobId]="id()" [chosen]="recipient()" (chooseContact)="recipient.set($event)" />
        } @else {
          <section class="card">
            @if (cvs().length === 0) {
              <p class="muted">{{ i18n.t('match.noCv') }} <a routerLink="/app/cvs">{{ i18n.t('nav.cvs') }}</a></p>
            } @else {
              <div class="cvpick">
                <label for="cv-pick">{{ i18n.t('match.cv') }}</label>
                <select id="cv-pick" (change)="choose($any($event.target).value)">
                  @for (c of cvs(); track c.id) {
                    <option [value]="c.id" [selected]="c.id === selected.id()">{{ c.label }}</option>
                  }
                </select>
              </div>
            }
          </section>
          @if (tab() === 'letter') {
            <app-doc-workspace kind="LETTER" [jobId]="id()" [cvId]="selected.id()" />
          } @else if (tab() === 'interview') {
            <app-interview-prep [jobId]="id()" [cvId]="selected.id()" />
          } @else if (tab() === 'email') {
            <app-doc-workspace kind="EMAIL" [jobId]="id()" [cvId]="selected.id()" [recipient]="recipient()?.value ?? null" />
          } @else {
            @if (matchLoading()) {
              <p class="muted"><span class="spinner"></span> {{ i18n.t('match.running') }}</p>
            }
            @if (matchError()) { <p class="banner error" role="alert">{{ matchError() }}</p> }
            <app-match-report [view]="match()" [part]="tab() === 'cv' ? 'cv' : 'analysis'" />
          }
        }
      </div>
    } @else {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    }
  `,
})
export class JobDetailPage {
  protected readonly i18n = inject(I18n);
  protected readonly selected = inject(SelectedCv);
  private readonly api = inject(Api);

  readonly id = input.required<string>();

  protected readonly job = signal<JobDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('description');

  protected warnKey(code: string): Key {
    return `warn.${code}` as Key;
  }
  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly match = signal<MatchView | null>(null);
  protected readonly matchLoading = signal(false);
  protected readonly matchError = signal<string | null>(null);
  /** The published email the user chose to address the application email to. */
  protected readonly recipient = signal<ContactView | null>(null);

  constructor() {
    effect(() => {
      this.api.getJob(this.id()).subscribe({
        next: (j) => this.job.set(j),
        error: (e) => this.error.set(problemMessage(e)),
      });
    });
    this.api.listCvs().subscribe((c) => {
      this.cvs.set(c);
      const chosen = this.selected.id();
      if (!c.some((x) => x.id === chosen)) {
        this.selected.select(c[0]?.id ?? null);
      }
    });
  }

  protected open(tab: Tab) {
    this.tab.set(tab);
    if (!this.match() && !this.matchLoading()) {
      this.loadMatch();
    }
  }

  protected choose(id: string) {
    this.selected.select(id);
    this.match.set(null);
    if (this.tab() === 'match' || this.tab() === 'cv') {
      this.loadMatch();
    }
  }

  private loadMatch() {
    const cv = this.selected.id();
    if (!cv) {
      return;
    }
    this.matchLoading.set(true);
    this.matchError.set(null);
    this.api.getMatch(this.id(), cv).subscribe({
      next: (m) => {
        this.match.set(m);
        this.matchLoading.set(false);
      },
      error: (e) => {
        this.matchError.set(problemMessage(e));
        this.matchLoading.set(false);
      },
    });
  }

  protected rm(m: string): Key {
    return `rm.${m}` as Key;
  }
  protected salary(j: JobDetail): string | null {
    const s = j.summary;
    return formatSalary(s.salaryMin, s.salaryMax, s.salaryCurrency, this.i18n.lang());
  }
  protected link(u: string | null | undefined): string | null {
    return safeUrl(u);
  }
}
