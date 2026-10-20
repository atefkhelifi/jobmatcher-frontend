import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api, AppDashboard, CLOSED_STATUSES, CvSummary, OPEN_STATUSES, SystemStatus } from '../core/api';
import { Auth } from '../core/auth';
import { I18n, Key } from '../core/i18n';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  styles: `
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .steps li { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
    .tick { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); flex: none; display: inline-grid; place-items: center; font-size: 12px; transform: translateY(4px); }
    .tick.done { background: var(--low); border-color: var(--low); color: var(--bg); }
    .stat { font: 700 32px/1 var(--display); font-variant-numeric: tabular-nums; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .dot.up { background: var(--low); }
    .dot.down { background: var(--attn); }
    .pending { color: var(--muted); }
  `,
  template: `
    <div class="stack">
      <h1>{{ i18n.t('dash.hello', { name: auth.user()?.displayName ?? '' }) }}</h1>

      <div class="grid-2">
        <section class="card">
          <h2>{{ i18n.t('dash.next') }}</h2>
          <ol class="steps">
            <li>
              <span class="tick" [class.done]="cvs().length > 0" aria-hidden="true">{{ cvs().length > 0 ? '✓' : '' }}</span>
              <a routerLink="/app/cvs">{{ i18n.t('dash.step.upload') }}</a>
            </li>
            <li>
              <span class="tick" [class.done]="reviewed() > 0" aria-hidden="true">{{ reviewed() > 0 ? '✓' : '' }}</span>
              @if (firstUnreviewed(); as cv) {
                <a [routerLink]="['/app/cvs', cv.id]">{{ i18n.t('dash.step.review') }}</a>
              } @else {
                <span [class.pending]="cvs().length === 0">{{ i18n.t('dash.step.review') }}</span>
              }
            </li>
            <li>
              <span class="tick" aria-hidden="true"></span>
              @if (cvs()[0]; as cv) {
                <a [routerLink]="['/app/cvs', cv.id, 'analysis']">{{ i18n.t('dash.step.analyze') }}</a>
              } @else {
                <span class="pending">{{ i18n.t('dash.step.analyze') }}</span>
              }
            </li>
            <li>
              <span class="tick" aria-hidden="true"></span>
              <a routerLink="/app/preferences">{{ i18n.t('dash.step.prefs') }}</a>
            </li>
            <li>
              <span class="tick" aria-hidden="true"></span>
              <a routerLink="/app/jobs">{{ i18n.t('dash.step.discover') }}</a>
            </li>
            <li>
              <span class="tick" aria-hidden="true"></span>
              <a routerLink="/app/jobs">{{ i18n.t('dash.step.match') }}</a>
            </li>
            <li>
              <span class="tick" [class.done]="(apps()?.total ?? 0) > 0" aria-hidden="true">{{ (apps()?.total ?? 0) > 0 ? '✓' : '' }}</span>
              <a routerLink="/app/jobs">{{ i18n.t('dash.step.apply') }}</a>
            </li>
          </ol>
        </section>

        <div class="stack-sm">
          <section class="card">
            <div class="row between">
              <span class="eyebrow">{{ i18n.t('dash.apps') }}</span>
              <a routerLink="/app/applications">{{ i18n.t('nav.applications') }} →</a>
            </div>
            @if (apps(); as a) {
              <p><strong>{{ i18n.t('dash.apps.total', { n: a.total }) }}</strong></p>
              <div class="row" style="gap: 6px">
                @for (s of statuses; track s) {
                  @if (a.byStatus[s] > 0) { <span class="chip neutral">{{ i18n.t(statusKey(s)) }} {{ a.byStatus[s] }}</span> }
                }
              </div>
              <h3>{{ i18n.t('dash.dueReminders') }}</h3>
              @for (r of a.dueReminders; track r.id) {
                <p class="hint"><a [routerLink]="['/app/applications', r.applicationId]">{{ r.text }}</a> · {{ r.dueAt | date: 'MMM d' }}
                  @if (r.overdue) { <span class="chip high">{{ i18n.t('app.overdue', { n: 1 }) }}</span> }</p>
              } @empty { <p class="hint">{{ i18n.t('dash.nothing') }}</p> }
              <h3>{{ i18n.t('dash.interviews') }}</h3>
              @for (i of a.upcomingInterviews; track i.applicationId + i.scheduledAt) {
                <p class="hint"><a [routerLink]="['/app/applications', i.applicationId]">{{ i.applicationTitle }}</a> · {{ i.scheduledAt | date: 'EEE d MMM, HH:mm' }}</p>
              } @empty { <p class="hint">{{ i18n.t('dash.nothing') }}</p> }
            }
          </section>
          <section class="card">
            <div class="row" style="gap: 32px">
              <div class="stack-sm"><span class="eyebrow">{{ i18n.t('dash.cvs') }}</span><span class="stat">{{ cvs().length }}</span></div>
              <div class="stack-sm"><span class="eyebrow">{{ i18n.t('dash.reviewed') }}</span><span class="stat">{{ reviewed() }}</span></div>
            </div>
          </section>
          <section class="card">
            <span class="eyebrow">{{ i18n.t('dash.system') }}</span>
            @if (status(); as s) {
              <p>
                <span class="dot" [class.up]="s.ai.available" [class.down]="!s.ai.available" aria-hidden="true"></span>
                <strong>{{ i18n.t('dash.ai') }}:</strong> {{ s.ai.provider }} ·
                {{ s.ai.available ? i18n.t('dash.ai.ok') : i18n.t('dash.ai.down') }}
              </p>
              <p class="hint">{{ s.ai.detail }}</p>
              @if (!s.ai.available) {
                <p class="hint">{{ i18n.t('dash.ai.help') }}</p>
              }
            } @else {
              <p class="muted">{{ i18n.t('common.loading') }}</p>
            }
          </section>
        </div>
      </div>
    </div>
  `,
})
export class Dashboard {
  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }

  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);

  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly status = signal<SystemStatus | null>(null);
  protected readonly apps = signal<AppDashboard | null>(null);
  protected readonly statuses = [...OPEN_STATUSES, ...CLOSED_STATUSES];
  protected readonly reviewed = computed(() => this.cvs().filter((c) => c.reviewed).length);
  protected readonly firstUnreviewed = computed(() => this.cvs().find((c) => !c.reviewed) ?? null);

  constructor() {
    this.api.listCvs().subscribe((c) => this.cvs.set(c));
    this.api.appDashboard().subscribe({ next: (a) => this.apps.set(a), error: () => undefined });
    this.api.status().subscribe({ next: (s) => this.status.set(s), error: () => this.status.set(null) });
  }
}
