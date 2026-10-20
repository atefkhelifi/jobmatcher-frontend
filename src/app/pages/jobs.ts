import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Api,
  CvSummary,
  JobFilter,
  JobPage,
  RemoteMode,
  RunResult,
  SavedSearch,
  SearchRequest,
  SourceView,
  problemMessage,
} from '../core/api';
import { I18n, Key } from '../core/i18n';
import { SelectedCv } from '../core/selected-cv';
import { formatSalary, safeUrl } from '../shared/format';

@Component({
  selector: 'app-jobs',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  styles: `
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
    .src { display: flex; flex-wrap: wrap; gap: 8px 20px; }
    .job { display: grid; gap: 8px; padding: 16px 0; border-top: 1px solid var(--line); }
    .job:first-of-type { border-top: 0; padding-top: 0; }
    .job h3 { font-size: 17px; overflow-wrap: anywhere; }
    .titlebar { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .score { flex: none; font: 600 13px var(--mono); font-variant-numeric: tabular-nums; border: 1px solid var(--high); color: var(--high); border-radius: 6px; padding: 4px 8px; }
    .score.mid { border-color: var(--attn); color: var(--attn); }
    .score.hi { border-color: var(--low); color: var(--low); }
    .score.none { border-color: var(--line); color: var(--muted); font-weight: 400; }
    .job h3 a { color: var(--fg); text-decoration: none; }
    .job h3 a:hover { color: var(--accent); text-decoration: underline; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: var(--muted); align-items: center; }
    .snippet { color: var(--muted); font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .health { display: grid; gap: 10px; }
    .health-row { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding-top: 10px; border-top: 1px solid var(--line); }
    .health-row:first-child { border-top: 0; padding-top: 0; }
    .saved-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 12px; align-items: center; padding-top: 10px; border-top: 1px solid var(--line); }
    .saved-row:first-of-type { border-top: 0; padding-top: 0; }
    .pager { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
    details > summary { cursor: pointer; font-weight: 600; }
    details[open] > summary { margin-bottom: 12px; }
    .tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 16px; align-items: start; }
  `,
  template: `
    <div class="stack">
      <h1>{{ i18n.t('jobs.title') }}</h1>

      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      <section class="card">
        <h2>{{ i18n.t('jobs.search.title') }}</h2>
        <p class="muted">{{ i18n.t('jobs.search.intro') }}</p>
        <form class="stack-sm" [formGroup]="searchForm" (ngSubmit)="runSearch()">
          <div class="cols">
            <label for="s-kw">{{ i18n.t('jobs.keywords') }}<input id="s-kw" type="text" formControlName="keywords" [placeholder]="i18n.t('jobs.keywords.ph')" maxlength="200" /></label>
            <label for="s-loc">{{ i18n.t('jobs.location') }}<input id="s-loc" type="text" formControlName="location" [placeholder]="i18n.t('jobs.location.ph')" maxlength="120" /></label>
          </div>
          <label class="check" for="s-remote"><input id="s-remote" type="checkbox" formControlName="remoteOnly" /> {{ i18n.t('jobs.remoteOnly') }}</label>
          <fieldset>
            <legend>{{ i18n.t('jobs.sources') }}</legend>
            <div class="src">
              @for (s of enabledSources(); track s.key) {
                <label class="check" [for]="'src-' + s.key">
                  <input [id]="'src-' + s.key" type="checkbox" [checked]="chosen().has(s.key)" (change)="toggleSource(s.key)" /> {{ s.name }}
                </label>
              }
            </div>
          </fieldset>
          <div class="row">
            <button class="btn primary" type="submit" [disabled]="running()">
              @if (running()) { <span class="spinner"></span> {{ i18n.t('jobs.running') }} } @else { {{ i18n.t('jobs.run') }} }
            </button>
          </div>
        </form>

        @if (result(); as r) {
          <div class="banner ok" role="status">
            <p>{{ i18n.t('jobs.result', { n: r.created, u: r.updated, d: r.duplicates }) }}</p>
            @for (s of r.sources; track s.source) {
              <p class="hint">
                {{ i18n.t('jobs.result.source', { name: sourceName(s.source), n: s.fetched }) }}
                @if (s.error) { <strong class="error-text"> · {{ s.error }}</strong> }
              </p>
            }
          </div>
        }

        <details>
          <summary>{{ i18n.t('jobs.save') }}</summary>
          <form class="stack-sm" [formGroup]="saveForm" (ngSubmit)="saveSearch()">
            <label for="sv-name">{{ i18n.t('jobs.save.name') }}<input id="sv-name" type="text" formControlName="name" maxlength="120" /></label>
            <label class="check" for="sv-auto"><input id="sv-auto" type="checkbox" formControlName="autoRun" /> {{ i18n.t('jobs.save.auto') }}</label>
            @if (saveForm.controls.autoRun.value) {
              <label for="sv-int">{{ i18n.t('jobs.save.every') }} ({{ i18n.t('jobs.save.hours') }})
                <input id="sv-int" type="number" min="1" max="168" formControlName="intervalHours" />
              </label>
              <label for="sv-min">{{ i18n.t('jobs.save.minScore') }}
                <input id="sv-min" type="number" min="0" max="100" formControlName="minScore" />
              </label>
            }
            <div><button class="btn" type="submit" [disabled]="saveForm.invalid">{{ i18n.t('jobs.save.go') }}</button></div>
          </form>
        </details>
      </section>

      <div class="tools">
        <section class="card">
          <h2>{{ i18n.t('jobs.saved') }}</h2>
          @for (s of saved(); track s.id) {
            <div class="saved-row">
              <div>
                <strong>{{ s.name }}</strong>
                <div class="hint">
                  {{ s.keywords || '—' }}@if (s.location) { · {{ s.location }} }@if (s.remoteOnly) { · {{ i18n.t('rm.REMOTE') }} }
                  @if (s.autoRun) { · {{ i18n.t('jobs.saved.auto', { h: s.intervalHours }) }} }
                </div>
                <div class="hint">
                  @if (s.lastRunAt) { {{ i18n.t('jobs.saved.last', { date: (s.lastRunAt | date: 'short') ?? '', n: s.lastNewCount ?? 0 }) }} } @else { {{ i18n.t('jobs.saved.never') }} }
                </div>
              </div>
              <div class="row">
                <button class="btn small" type="button" (click)="runSaved(s)" [disabled]="running()">{{ i18n.t('jobs.saved.run') }}</button>
                <button class="btn small" type="button" (click)="deleteSaved(s)">{{ i18n.t('cv.delete') }}</button>
              </div>
            </div>
          } @empty {
            <p class="muted">{{ i18n.t('jobs.saved.empty') }}</p>
          }
        </section>

        <section class="card">
          <h2>{{ i18n.t('jobs.import.title') }}</h2>
          <p class="muted">{{ i18n.t('jobs.import.intro') }}</p>
          <form class="stack-sm" [formGroup]="importForm" (ngSubmit)="importUrl()">
            <label for="imp-url">{{ i18n.t('jobs.import.url') }}<input id="imp-url" type="text" inputmode="url" formControlName="url" placeholder="https://" maxlength="2000" /></label>
            <div>
              <button class="btn" type="submit" [disabled]="importForm.invalid || importing()">
                @if (importing()) { <span class="spinner"></span> {{ i18n.t('jobs.import.busy') }} } @else { {{ i18n.t('jobs.import.go') }} }
              </button>
            </div>
          </form>
        </section>
      </div>

      <section class="card">
        <h2>{{ i18n.t('match.cv') }}</h2>
        @if (cvs().length === 0) {
          <p class="muted">{{ i18n.t('match.noCv') }} <a routerLink="/app/cvs">{{ i18n.t('nav.cvs') }}</a></p>
        } @else {
          <div class="row">
            <label for="cv-select" class="sr-only">{{ i18n.t('match.cv') }}</label>
            <select id="cv-select" style="width: auto; min-width: 220px; max-width: 100%" (change)="chooseCv($any($event.target).value)">
              @for (c of cvs(); track c.id) {
                <option [value]="c.id" [selected]="c.id === selected.id()">{{ c.label }}</option>
              }
            </select>
            @if (scoring()) { <span class="muted"><span class="spinner"></span> {{ i18n.t('match.running') }}</span> }
          </div>
          @if (selectedUnreviewed()) { <p class="banner attn">{{ i18n.t('match.reviewHint') }}</p> }
          <p class="hint">{{ i18n.t('match.disclaimer') }}</p>
        }
      </section>

      <section class="card">
        <h2>{{ i18n.t('jobs.filter.title') }}</h2>
        <form class="stack-sm" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="cols">
            <label for="f-q">{{ i18n.t('jobs.filter.q') }}<input id="f-q" type="text" formControlName="q" /></label>
            <label for="f-loc">{{ i18n.t('jobs.location') }}<input id="f-loc" type="text" formControlName="location" /></label>
            <label for="f-rm">{{ i18n.t('jobs.filter.remote') }}
              <select id="f-rm" formControlName="remote">
                <option value="">{{ i18n.t('jobs.filter.any') }}</option>
                <option value="REMOTE">{{ i18n.t('rm.REMOTE') }}</option>
                <option value="HYBRID">{{ i18n.t('rm.HYBRID') }}</option>
                <option value="ONSITE">{{ i18n.t('rm.ONSITE') }}</option>
              </select>
            </label>
            <label for="f-sort">{{ i18n.t('jobs.filter.sort') }}
              <select id="f-sort" formControlName="sort">
                <option value="newest">{{ i18n.t('jobs.sort.newest') }}</option>
                <option value="deadline">{{ i18n.t('jobs.sort.deadline') }}</option>
                <option value="salary">{{ i18n.t('jobs.sort.salary') }}</option>
                <option value="company">{{ i18n.t('jobs.sort.company') }}</option>
                @if (selected.id()) { <option value="match">{{ i18n.t('jobs.sort.match') }}</option> }
              </select>
            </label>
            <label for="f-posted">{{ i18n.t('jobs.filter.posted') }}
              <select id="f-posted" formControlName="postedWithinDays">
                <option [ngValue]="null">{{ i18n.t('jobs.filter.posted.any') }}</option>
                <option [ngValue]="1">{{ i18n.t('jobs.filter.posted.d', { n: 1 }) }}</option>
                <option [ngValue]="7">{{ i18n.t('jobs.filter.posted.d', { n: 7 }) }}</option>
                <option [ngValue]="30">{{ i18n.t('jobs.filter.posted.d', { n: 30 }) }}</option>
              </select>
            </label>
            <label for="f-sal">{{ i18n.t('jobs.filter.salary') }}<input id="f-sal" type="number" min="0" formControlName="minSalary" /></label>
            @if (selected.id()) {
              <label for="f-score">{{ i18n.t('jobs.filter.minScore') }}<input id="f-score" type="number" min="0" max="100" formControlName="minScore" /></label>
            }
          </div>
          <div class="row">
            <label class="check" for="f-unk"><input id="f-unk" type="checkbox" formControlName="includeUnknownSalary" /> {{ i18n.t('jobs.filter.salary.unknown') }}</label>
            <label class="check" for="f-exp"><input id="f-exp" type="checkbox" formControlName="includeExpired" /> {{ i18n.t('jobs.filter.expired') }}</label>
          </div>
          <div><button class="btn" type="submit">{{ i18n.t('nav.jobs') }}</button></div>
        </form>
      </section>

      <section class="card">
        @if (loading()) {
          <p class="muted">{{ i18n.t('common.loading') }}</p>
        } @else if (page(); as p) {
          <p class="hint">{{ i18n.t('jobs.count', { n: p.total }) }}</p>
          @for (j of p.items; track j.id) {
            <article class="job">
              <div class="titlebar">
                <h3><a [routerLink]="['/app/jobs', j.id]">{{ j.title }}</a></h3>
                @if (selected.id()) {
                  @if (j.matchScore !== null) {
                    <span class="score" [class.hi]="j.matchScore >= 75" [class.mid]="j.matchScore >= 50 && j.matchScore < 75"
                      [title]="i18n.t('match.badge.hint', { pct: j.matchCoverage ?? 0 })">{{ i18n.t('match.badge', { score: j.matchScore }) }}</span>
                  } @else {
                    <span class="score none">{{ i18n.t('match.badge.none') }}</span>
                  }
                }
              </div>
              <div class="meta">
                <strong>{{ j.company || i18n.t('common.unknown') }}</strong>
                <span>{{ j.location || i18n.t('common.unknown') }}</span>
                <span class="chip" [class.accent]="j.remoteMode === 'REMOTE'" [class.neutral]="j.remoteMode !== 'REMOTE'">{{ i18n.t(rm(j.remoteMode)) }}</span>
                @if (j.status === 'EXPIRED') { <span class="chip high">{{ i18n.t('jobs.card.expired') }}</span> }
                @if (j.submittedByYou) { <span class="chip neutral">{{ i18n.t('jobs.card.yours') }}</span> }
              </div>
              <div class="meta">
                <span>{{ j.postedAt ? i18n.t('jobs.card.posted', { date: (j.postedAt | date: 'mediumDate') ?? '' }) : i18n.t('jobs.card.postedUnknown') }}</span>
                <span>{{ salary(j) ?? i18n.t('jobs.card.salaryUnknown') }}</span>
                @if (j.validThrough) { <span>{{ i18n.t('jobs.card.deadline', { date: (j.validThrough | date: 'mediumDate') ?? '' }) }}</span> }
                <span>{{ j.sourceName }}</span>
              </div>
              <p class="snippet">{{ j.snippet }}</p>
              <div class="row">
                @if (link(j.applyUrl || j.url); as href) {
                  <a class="btn small" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('jobs.card.apply') }} ↗</a>
                }
              </div>
            </article>
          } @empty {
            <p class="muted">{{ i18n.t('jobs.empty') }}</p>
          }
          @if (p.totalPages > 1) {
            <div class="pager">
              <button class="btn small" type="button" (click)="go(p.page - 1)" [disabled]="p.page === 0">{{ i18n.t('jobs.prev') }}</button>
              <span class="hint">{{ i18n.t('jobs.page', { p: p.page + 1, t: p.totalPages }) }}</span>
              <button class="btn small" type="button" (click)="go(p.page + 1)" [disabled]="p.page + 1 >= p.totalPages">{{ i18n.t('jobs.next') }}</button>
            </div>
          }
        }
      </section>

      <section class="card">
        <h2>{{ i18n.t('jobs.health') }}</h2>
        <div class="health">
          @for (s of sources(); track s.key) {
            <div class="health-row">
              <div>
                <strong>{{ s.name }}</strong>
                @if (s.enabled) {
                  <div class="hint">
                    {{ i18n.t('jobs.health.offers', { n: s.activeOffers }) }}
                    @if (s.lastSuccessAt) { · {{ i18n.t('jobs.health.lastOk', { date: (s.lastSuccessAt | date: 'short') ?? '' }) }} }
                  </div>
                  @if (s.lastError) { <div class="hint error-text">{{ s.lastError }}</div> }
                } @else {
                  <div class="hint">{{ i18n.t('jobs.health.disabled') }}. {{ s.disabledReason }}</div>
                }
                <a class="hint" [href]="s.termsUrl" target="_blank" rel="noopener noreferrer">{{ i18n.t('jobs.health.terms') }} ↗</a>
              </div>
              <span class="chip" [class.low]="s.state === 'healthy'" [class.med]="s.state === 'degraded'" [class.high]="s.state === 'failing'" [class.neutral]="s.state === 'unused' || s.state === 'disabled'">{{ i18n.t(stateKey(s.state)) }}</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class Jobs {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly sources = signal<SourceView[]>([]);
  protected readonly enabledSources = computed(() => this.sources().filter((s) => s.enabled));
  protected readonly chosen = signal<Set<string>>(new Set());
  protected readonly saved = signal<SavedSearch[]>([]);
  protected readonly page = signal<JobPage | null>(null);
  protected readonly result = signal<RunResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly running = signal(false);
  protected readonly importing = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly searchForm = this.fb.group({ keywords: [''], location: [''], remoteOnly: [false] });
  protected readonly saveForm = this.fb.group({
    name: ['', [(c: { value: string }) => (c.value.trim() ? null : { required: true })]],
    autoRun: [false],
    intervalHours: [24],
    minScore: [60],
  });
  protected readonly importForm = this.fb.group({
    url: ['', [(c: { value: string }) => (/^https?:\/\/\S+$/i.test(c.value.trim()) ? null : { url: true })]],
  });
  protected readonly filterForm = this.fb.group({
    q: [''],
    location: [''],
    remote: ['' as '' | RemoteMode],
    sort: ['newest' as JobFilter['sort']],
    postedWithinDays: [null as number | null],
    minSalary: [null as number | null],
    minScore: [null as number | null],
    includeUnknownSalary: [true],
    includeExpired: [false],
  });

  protected readonly selected = inject(SelectedCv);
  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly scoring = signal(false);
  protected readonly selectedUnreviewed = computed(() => {
    const c = this.cvs().find((x) => x.id === this.selected.id());
    return c !== undefined && !c.reviewed;
  });

  constructor() {
    this.api.listCvs().subscribe({
      next: (list) => {
        this.cvs.set(list);
        if (!list.some((c) => c.id === this.selected.id())) {
          this.selected.select(list[0]?.id ?? null);
        }
        if (this.selected.id()) {
          this.filterForm.controls.sort.setValue('match');
          this.scoreThenLoad();
        }
      },
      error: () => undefined,
    });
    this.api.sources().subscribe({
      next: (s) => {
        this.sources.set(s);
        this.chosen.set(new Set(s.filter((x) => x.enabled).map((x) => x.key)));
      },
      error: (e) => this.error.set(problemMessage(e)),
    });
    this.api.savedSearches().subscribe({ next: (s) => this.saved.set(s), error: () => undefined });
    this.load(0);
  }

  protected rm(m: RemoteMode): Key {
    return `rm.${m}` as Key;
  }
  protected stateKey(s: string): Key {
    return `jobs.state.${s}` as Key;
  }
  protected sourceName(key: string): string {
    return this.sources().find((s) => s.key === key)?.name ?? key;
  }
  protected salary(j: { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null }): string | null {
    return formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency, this.i18n.lang());
  }
  protected link(u: string | null): string | null {
    return safeUrl(u);
  }

  protected toggleSource(key: string) {
    this.chosen.update((s) => {
      const n = new Set(s);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  }

  private searchRequest(): SearchRequest {
    const v = this.searchForm.getRawValue();
    return { keywords: v.keywords.trim(), location: v.location.trim(), remoteOnly: v.remoteOnly, sourceKeys: [...this.chosen()] };
  }

  protected runSearch() {
    this.finishRun(this.api.runSearch(this.searchRequest()));
  }

  protected runSaved(s: SavedSearch) {
    this.finishRun(this.api.runSavedSearch(s.id), true);
  }

  private finishRun(request: ReturnType<Api['runSearch']>, refreshSaved = false) {
    this.running.set(true);
    this.error.set(null);
    request.subscribe({
      next: (r) => {
        this.result.set(r);
        this.running.set(false);
        this.scoreThenLoad();
        this.api.sources().subscribe((s) => this.sources.set(s));
        if (refreshSaved) {
          this.api.savedSearches().subscribe((x) => this.saved.set(x));
        }
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.running.set(false);
      },
    });
  }

  protected saveSearch() {
    const v = this.saveForm.getRawValue();
    this.api.saveSearch(v.name.trim(), this.searchRequest(), v.autoRun, v.intervalHours, v.minScore).subscribe({
      next: (s) => {
        this.saved.update((l) => [s, ...l]);
        this.saveForm.reset({ name: '', autoRun: false, intervalHours: 24, minScore: 60 });
      },
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected deleteSaved(s: SavedSearch) {
    this.api.deleteSavedSearch(s.id).subscribe({
      next: () => this.saved.update((l) => l.filter((x) => x.id !== s.id)),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected importUrl() {
    this.importing.set(true);
    this.error.set(null);
    this.api.importJob(this.importForm.getRawValue().url.trim()).subscribe({
      next: () => {
        this.importing.set(false);
        this.importForm.reset({ url: '' });
        this.scoreThenLoad();
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.importing.set(false);
      },
    });
  }

  protected applyFilters() {
    this.load(0);
  }

  protected go(p: number) {
    this.load(Math.max(0, p));
  }

  protected chooseCv(id: string) {
    this.selected.select(id);
    this.filterForm.controls.sort.setValue('match');
    this.scoreThenLoad();
  }

  /** Scores every offer against the chosen CV (only changed ones are recomputed server-side), then shows the list. */
  private scoreThenLoad() {
    const cv = this.selected.id();
    if (!cv) {
      this.load(0);
      return;
    }
    this.scoring.set(true);
    this.api.runMatches(cv).subscribe({
      next: () => {
        this.scoring.set(false);
        this.load(0);
      },
      error: (e) => {
        this.scoring.set(false);
        this.error.set(problemMessage(e));
        this.load(0);
      },
    });
  }

  private load(page: number) {
    this.loading.set(true);
    const f = this.filterForm.getRawValue();
    const cvId = this.selected.id();
    const sort = f.sort === 'match' && !cvId ? 'newest' : f.sort;
    this.api.listJobs({ ...f, sort, cvId, minScore: f.minScore || null, minSalary: f.minSalary || null, page }).subscribe({
      next: (p) => {
        this.page.set(p);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }
}
