import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, AppStatus, AppSummary, CLOSED_STATUSES, DuplicateApp, OPEN_STATUSES, duplicateDetails, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { downloadBlob } from '../shared/download';

@Component({
  selector: 'app-applications',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NgTemplateOutlet],
  styles: `
    .board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 8px; align-items: start; }
    @media (max-width: 720px) { .board { grid-auto-flow: row; grid-auto-columns: unset; overflow: visible; } }
    .col { background: var(--surface-2); border-radius: var(--radius); padding: 12px; display: grid; gap: 10px; align-content: start; min-width: 0; }
    .col h2 { font: 600 13px var(--mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: flex; justify-content: space-between; }
    .card-app { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px; display: grid; gap: 6px; }
    .card-app h3 { font-size: 15px; overflow-wrap: anywhere; }
    .card-app h3 a { color: var(--fg); text-decoration: none; }
    .card-app h3 a:hover { color: var(--accent); text-decoration: underline; }
    .meta { font-size: 13px; color: var(--muted); display: grid; gap: 2px; overflow-wrap: anywhere; }
    .card-app select { min-height: 32px; padding: 4px 8px; font-size: 13px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
  `,
  template: `
    <div class="stack">
      <div class="row between">
        <h1>{{ i18n.t('app.title') }}</h1>
        <button class="btn" type="button" (click)="downloadCalendar()">{{ i18n.t('app.calendar') }}</button>
      </div>

      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      <details class="card">
        <summary><strong>{{ i18n.t('app.add') }}</strong></summary>
        <form class="stack-sm" [formGroup]="form" (ngSubmit)="add(false)" style="margin-top: 12px">
          <div class="cols">
            <label for="a-title">{{ i18n.t('app.add.title') }}<input id="a-title" type="text" formControlName="title" maxlength="300" /></label>
            <label for="a-co">{{ i18n.t('app.add.company') }}<input id="a-co" type="text" formControlName="company" maxlength="300" /></label>
            <label for="a-loc">{{ i18n.t('app.add.location') }}<input id="a-loc" type="text" formControlName="location" maxlength="300" /></label>
            <label for="a-url">{{ i18n.t('app.add.url') }}<input id="a-url" type="text" inputmode="url" formControlName="jobUrl" placeholder="https://" maxlength="2000" /></label>
            <label for="a-st">{{ i18n.t('app.add.status') }}
              <select id="a-st" formControlName="status">
                @for (s of startStatuses; track s) { <option [value]="s">{{ i18n.t(statusKey(s)) }}</option> }
              </select>
            </label>
          </div>
          @if (duplicates().length > 0) {
            <div class="banner attn" role="alert">
              <strong>{{ i18n.t('track.dup.title') }}</strong>
              <ul>
                @for (d of duplicates(); track d.id) {
                  <li><a [routerLink]="['/app/applications', d.id]">{{ d.title }}@if (d.company) { · {{ d.company }} }</a> · {{ i18n.t(statusKey(d.status)) }}</li>
                }
              </ul>
            </div>
          }
          <div class="row">
            <button class="btn primary" type="submit" [disabled]="form.invalid || busy()">
              {{ duplicates().length > 0 ? i18n.t('track.dup.confirm') : i18n.t('app.add.go') }}
            </button>
          </div>
        </form>
      </details>

      @if (loading()) {
        <p class="muted">{{ i18n.t('common.loading') }}</p>
      } @else if (all().length === 0) {
        <p class="card muted">{{ i18n.t('app.empty') }}</p>
      } @else {
        @if (visibleStatuses().length > 0) {
          <div class="board">
            @for (s of visibleStatuses(); track s) {
              <section class="col" [attr.aria-label]="i18n.t(statusKey(s))">
                <h2>{{ i18n.t(statusKey(s)) }} <span>{{ byStatus()[s].length }}</span></h2>
                @for (a of byStatus()[s]; track a.id) { <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: a }" /> }
              </section>
            }
          </div>
        }
        <p class="hint">{{ i18n.t('app.emptyStages', { list: emptyStagesText() }) }}</p>

        @if (closed().length > 0) {
          <details>
            <summary><strong>{{ i18n.t('app.closed') }}</strong> ({{ closed().length }})</summary>
            <div class="stack-sm" style="margin-top: 12px">
              @for (a of closed(); track a.id) { <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: a }" /> }
            </div>
          </details>
        }
      }
    </div>

    <ng-template #card let-a>
      <article class="card-app">
        <h3><a [routerLink]="['/app/applications', a.id]">{{ a.title }}</a></h3>
        <div class="meta">
          @if (a.company) { <span>{{ a.company }}</span> }
          @if (a.nextInterviewAt) { <span>{{ i18n.t('app.interview', { date: (a.nextInterviewAt | date: 'MMM d, HH:mm') ?? '' }) }}</span> }
          @if (a.deadlineAt && !isClosed(a.status) && a.status !== 'APPLIED') { <span>{{ i18n.t('app.deadline', { date: (a.deadlineAt | date: 'mediumDate') ?? '' }) }}</span> }
          @if (a.nextReminderAt) { <span>{{ i18n.t('app.reminder', { date: (a.nextReminderAt | date: 'MMM d') ?? '' }) }}</span> }
        </div>
        @if (a.overdueReminders > 0) { <span class="chip high">{{ i18n.t('app.overdue', { n: a.overdueReminders }) }}</span> }
        @if (a.allowedNext.length > 0) {
          <select [attr.aria-label]="i18n.t('app.move')" (change)="move(a, $any($event.target).value); $any($event.target).value = ''">
            <option value="">{{ i18n.t('app.move') }}</option>
            @for (n of a.allowedNext; track n) { <option [value]="n">{{ i18n.t(statusKey(n)) }}</option> }
          </select>
        }
      </article>
    </ng-template>
  `,
})
export class Applications {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly openStatuses = OPEN_STATUSES;
  protected readonly startStatuses: AppStatus[] = ['DISCOVERED', 'TO_REVIEW', 'SHORTLISTED', 'PREPARING', 'APPLIED'];
  protected readonly all = signal<AppSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly duplicates = signal<DuplicateApp[]>([]);

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    company: [''],
    location: [''],
    jobUrl: ['', Validators.pattern(/^(https?:\/\/\S+)?$/i)],
    status: ['TO_REVIEW' as AppStatus],
  });

  protected readonly byStatus = computed(() => {
    const map = Object.fromEntries(OPEN_STATUSES.map((s) => [s, [] as AppSummary[]])) as Record<AppStatus, AppSummary[]>;
    this.all().forEach((a) => map[a.status]?.push(a));
    return map;
  });
  /** Only stages that hold applications become columns, so the board never needs sideways scrolling to find them. */
  protected readonly visibleStatuses = computed(() => OPEN_STATUSES.filter((s) => this.byStatus()[s].length > 0));
  protected readonly emptyStagesText = computed(() =>
    OPEN_STATUSES.filter((s) => this.byStatus()[s].length === 0)
      .map((s) => this.i18n.t(this.statusKey(s)))
      .join(', '),
  );
  protected readonly closed = computed(() => this.all().filter((a) => CLOSED_STATUSES.includes(a.status)));

  constructor() {
    this.reload();
  }

  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }
  protected isClosed(s: AppStatus): boolean {
    return CLOSED_STATUSES.includes(s);
  }

  private reload() {
    this.api.applications().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected move(a: AppSummary, status: string) {
    if (!status) {
      return;
    }
    this.error.set(null);
    this.api.moveApplication(a.id, status as AppStatus, null, status === 'APPLIED' ? 7 : null).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected add(confirm: boolean) {
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.api
      .createApplication({
        title: v.title.trim(),
        company: v.company.trim() || undefined,
        location: v.location.trim() || undefined,
        jobUrl: v.jobUrl.trim() || undefined,
        status: v.status,
        confirmDuplicate: confirm || this.duplicates().length > 0,
      })
      .subscribe({
        next: () => {
          this.form.reset({ title: '', company: '', location: '', jobUrl: '', status: 'TO_REVIEW' });
          this.duplicates.set([]);
          this.busy.set(false);
          this.reload();
        },
        error: (e) => {
          const dups = duplicateDetails(e);
          if (dups) {
            this.duplicates.set(dups);
          } else {
            this.error.set(problemMessage(e));
          }
          this.busy.set(false);
        },
      });
  }

  protected downloadCalendar() {
    this.api.calendar().subscribe({
      next: (b) => downloadBlob(b, 'jobmatcher.ics'),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }
}
