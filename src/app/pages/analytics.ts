import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Analytics, AnalyticsCount, Api, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';

@Component({
  selector: 'app-analytics',
  imports: [RouterLink],
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 12px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; display: grid; gap: 4px; }
    .kpi b { font: 700 28px/1 var(--display); }
    .kpi span { color: var(--muted); font-size: 13px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    .bars { list-style: none; padding: 0; display: grid; gap: 6px; }
    .bars li { display: grid; grid-template-columns: minmax(80px, 40%) 1fr auto; gap: 8px; align-items: center; font-size: 14px; }
    .bars .label { overflow-wrap: anywhere; }
    .bars .bar { height: 10px; background: var(--surface-2); border-radius: 5px; overflow: hidden; }
    .bars .bar i { display: block; height: 100%; background: var(--accent); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  `,
  template: `
    <div class="stack">
      <h1>{{ i18n.t('stats.title') }}</h1>
      <p class="muted">{{ i18n.t('stats.lede') }}</p>
      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
      @if (data(); as d) {
        @if (d.overview.tracked === 0) {
          <p class="muted">{{ i18n.t('stats.empty') }} <a routerLink="/app/jobs">{{ i18n.t('nav.jobs') }}</a></p>
        } @else {
          @if (d.overview.smallSample) {
            <p class="banner attn" role="note">{{ i18n.t('stats.small', { n: d.overview.smallSampleBelow }) }}</p>
          }
          <div class="kpis">
            <div class="kpi"><b>{{ d.overview.tracked }}</b><span>{{ i18n.t('stats.tracked') }}</span></div>
            <div class="kpi"><b>{{ d.overview.applied }}</b><span>{{ i18n.t('stats.applied') }}</span></div>
            <div class="kpi"><b>{{ d.overview.interviews }}</b><span>{{ i18n.t('stats.interviews') }}</span></div>
            <div class="kpi"><b>{{ d.overview.offers }}</b><span>{{ i18n.t('stats.offers') }}</span></div>
            <div class="kpi"><b>{{ pct(d.overview.interviewRate) }}</b><span>{{ i18n.t('stats.interviewRate') }}</span></div>
            <div class="kpi"><b>{{ d.overview.waiting }}</b><span>{{ i18n.t('stats.waiting') }}</span></div>
          </div>

          <div class="cols">
            <section class="card stack-sm">
              <h2>{{ i18n.t('stats.byStatus') }}</h2>
              <ul class="bars">
                @for (c of d.byStatus; track c.key) {
                  <li><span class="label">{{ i18n.t(statusKey(c.key)) }}</span><span class="bar"><i [style.width.%]="width(c, d.byStatus)"></i></span><b>{{ c.count }}</b></li>
                }
              </ul>
            </section>
            <section class="card stack-sm">
              <h2>{{ i18n.t('stats.byCountry') }}</h2>
              @if (d.byCountry.length === 0) { <p class="muted">{{ i18n.t('stats.none') }}</p> }
              <ul class="bars">
                @for (c of d.byCountry; track c.key) {
                  <li><span class="label">{{ c.key }}</span><span class="bar"><i [style.width.%]="width(c, d.byCountry)"></i></span><b>{{ c.count }}</b></li>
                }
              </ul>
            </section>
            <section class="card stack-sm">
              <h2>{{ i18n.t('stats.byRole') }}</h2>
              <ul class="bars">
                @for (c of d.byRole; track c.key) {
                  <li><span class="label">{{ c.key }}</span><span class="bar"><i [style.width.%]="width(c, d.byRole)"></i></span><b>{{ c.count }}</b></li>
                }
              </ul>
            </section>
            <section class="card stack-sm">
              <h2>{{ i18n.t('stats.skills') }}</h2>
              @if (d.skills.length === 0) { <p class="muted">{{ i18n.t('stats.none') }}</p> }
              <ul class="bars">
                @for (c of d.skills; track c.key) {
                  <li><span class="label">{{ c.key }}</span><span class="bar"><i [style.width.%]="width(c, d.skills)"></i></span><b>{{ c.count }}</b></li>
                }
              </ul>
            </section>
          </div>

          <section class="card stack-sm">
            <h2>{{ i18n.t('stats.stages') }}</h2>
            <table>
              <thead><tr><th>{{ i18n.t('stats.stage') }}</th><th>{{ i18n.t('stats.visits') }}</th><th>{{ i18n.t('stats.avgDays') }}</th></tr></thead>
              <tbody>
                @for (s of d.timePerStage; track s.status) {
                  <tr><td>{{ i18n.t(statusKey(s.status)) }}</td><td>{{ s.visits }}</td><td>{{ s.averageDays ?? '–' }}</td></tr>
                }
              </tbody>
            </table>
          </section>

          <section class="card stack-sm">
            <h2>{{ i18n.t('stats.byCv') }}</h2>
            @if (d.byCv.length === 0) {
              <p class="muted">{{ i18n.t('stats.cv.none') }}</p>
            } @else {
              <table>
                <thead><tr><th>CV</th><th>{{ i18n.t('stats.applied') }}</th><th>{{ i18n.t('stats.interviews') }}</th><th>{{ i18n.t('stats.interviewRate') }}</th></tr></thead>
                <tbody>
                  @for (c of d.byCv; track c.cvId) {
                    <tr><td>{{ c.label }}@if (c.cvId === d.bestCvId) { <span class="chip low"> ★</span> }</td><td>{{ c.applied }}</td><td>{{ c.interviews }}</td><td>{{ pct(c.interviewRate) }}</td></tr>
                  }
                </tbody>
              </table>
            }
            <p class="muted">{{ i18n.t(bestKey(d)) }}</p>
          </section>
        }
      }
    </div>
  `,
})
export class AnalyticsPage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  protected readonly data = signal<Analytics | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.analytics().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected pct(v: number | null): string {
    return v === null ? '–' : `${v}%`;
  }

  protected width(c: AnalyticsCount, all: AnalyticsCount[]): number {
    const max = Math.max(...all.map((x) => x.count), 1);
    return Math.round((c.count / max) * 100);
  }

  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }

  protected bestKey(d: Analytics): Key {
    return `stats.best.${d.bestCvNote}` as Key;
  }
}
