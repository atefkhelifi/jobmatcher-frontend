import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Analysis, Api, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';

@Component({
  selector: 'app-cv-analysis',
  imports: [RouterLink],
  styles: `
    .top { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; }
    @media (max-width: 560px) { .top { grid-template-columns: 1fr; } }
    .gauge { width: 132px; height: 132px; }
    .gauge text { fill: var(--fg); }
    .finding { border-top: 1px solid var(--line); padding-top: 14px; display: grid; gap: 8px; }
    .finding:first-of-type { border-top: 0; padding-top: 0; }
    .finding h3 { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
    blockquote { margin: 0; padding: 8px 12px; border-left: 3px solid var(--line); background: var(--surface-2); font-size: 14px; overflow-wrap: anywhere; }
    .sugg { background: var(--accent-soft); border-radius: var(--radius); padding: 10px 12px; font-size: 14px; }
    ul.plain { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
    .inv { display: grid; grid-template-columns: 120px 1fr; gap: 6px 12px; font-size: 14px; }
    .inv dt { font: 500 12px var(--mono); text-transform: uppercase; color: var(--muted); padding-top: 3px; }
    .inv dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: var(--surface-2); border-radius: 4px; padding: 2px 8px; }
    @media (max-width: 560px) { .inv { grid-template-columns: 1fr; } }
  `,
  template: `
    <div class="stack">
      <div class="stack-sm">
        <a [routerLink]="['/app/cvs', id()]" class="muted">← {{ i18n.t('review.title') }}</a>
        <h1>{{ i18n.t('an.title') }}</h1>
      </div>

      @if (error()) {
        <p class="banner error" role="alert">{{ error() }}</p>
      }

      <section class="card">
        <label class="check" for="useAi">
          <input id="useAi" type="checkbox" [checked]="useAi()" (change)="useAi.set($any($event.target).checked)" />
          <span>{{ i18n.t('an.useAi') }}</span>
        </label>
        <div class="row">
          <button class="btn primary" type="button" (click)="run()" [disabled]="busy()">
            @if (busy()) { <span class="spinner"></span> {{ i18n.t('an.running') }} } @else { {{ result() ? i18n.t('an.rerun') : i18n.t('an.run') }} }
          </button>
          @if (loading()) {
            <span class="muted">{{ i18n.t('common.loading') }}</span>
          }
        </div>
        <p class="hint">{{ i18n.t('an.approve') }}</p>
      </section>

      @if (result(); as a) {
        <section class="card">
          <div class="top">
            <svg class="gauge" viewBox="0 0 120 120" role="img" [attr.aria-label]="i18n.t('an.score') + ': ' + a.overallScore + '/100'">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="10" />
              <circle cx="60" cy="60" r="50" fill="none" [attr.stroke]="gaugeColor()" stroke-width="10" stroke-linecap="round"
                [attr.stroke-dasharray]="dash()" transform="rotate(-90 60 60)" />
              <text x="60" y="66" text-anchor="middle" font-size="30" font-weight="700" style="font-family: var(--display)">{{ a.overallScore }}</text>
              <text x="60" y="84" text-anchor="middle" font-size="10" style="font-family: var(--mono)">/ 100</text>
            </svg>
            <div class="stack-sm">
              <h2>{{ i18n.t('an.score') }}</h2>
              <p class="muted">{{ i18n.t('an.score.note') }}</p>
              <p class="hint">{{ i18n.t('an.words', { n: a.report.wordCount }) }}</p>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>{{ i18n.t('an.findings') }}</h2>
          @for (f of a.report.findings; track $index) {
            <article class="finding">
              <h3><span class="chip" [class]="f.severity">{{ i18n.t(sev(f.severity)) }}</span> {{ f.title }}</h3>
              <p class="muted">{{ f.detail }}</p>
              @for (e of f.evidence; track $index) {
                <blockquote><span class="hint">{{ i18n.t('an.evidence') }}: </span>{{ e }}</blockquote>
              }
              <p class="sugg"><strong>{{ i18n.t('an.suggestion') }}:</strong> {{ f.suggestion }}</p>
            </article>
          } @empty {
            <p class="muted">{{ i18n.t('an.none') }}</p>
          }
        </section>

        <div class="grid-2">
          <section class="card">
            <h2>{{ i18n.t('an.strengths') }}</h2>
            <ul class="plain">@for (s of a.report.strengths; track $index) { <li>{{ s }}</li> } @empty { <li class="muted">—</li> }</ul>
          </section>
          <section class="card">
            <h2>{{ i18n.t('an.gaps') }}</h2>
            <ul class="plain">@for (s of a.report.gaps; track $index) { <li>{{ s }}</li> } @empty { <li class="muted">—</li> }</ul>
          </section>
        </div>

        <section class="card">
          <h2>{{ i18n.t('an.skills') }}</h2>
          <dl class="inv">
            @for (cat of categories(); track cat) {
              <dt>{{ cat }}</dt>
              <dd>@for (s of a.report.skillInventory[cat]; track s) { <span class="tag">{{ s }}</span> }</dd>
            }
          </dl>
        </section>

        <section class="card">
          <h2>{{ i18n.t('an.ai') }}</h2>
          @switch (a.aiReview.status) {
            @case ('ok') {
              <p class="muted">{{ i18n.t('an.ai.ok', { provider: a.aiReview.provider }) }}</p>
              @for (i of a.aiReview.issues; track $index) {
                <article class="finding">
                  <blockquote>{{ i.quote }}</blockquote>
                  <p class="muted">{{ i.problem }}</p>
                  @if (i.suggestion) { <p class="sugg"><strong>{{ i18n.t('an.suggestion') }}:</strong> {{ i.suggestion }}</p> }
                </article>
              } @empty {
                <p>{{ i18n.t('an.ai.clean') }}</p>
              }
            }
            @case ('unavailable') { <p class="banner attn">{{ i18n.t('an.ai.unavailable') }}</p> }
            @case ('unusable-output') { <p class="banner attn">{{ i18n.t('an.ai.unusable') }}</p> }
            @default { <p class="muted">{{ i18n.t('an.ai.skipped') }}</p> }
          }
        </section>
      } @else if (!loading() && !busy()) {
        <p class="muted">{{ i18n.t('an.noneYet') }}</p>
      }
    </div>
  `,
})
export class CvAnalysis {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);

  readonly id = input.required<string>();

  protected readonly result = signal<Analysis | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly useAi = signal(true);

  protected readonly categories = computed(() => Object.keys(this.result()?.report.skillInventory ?? {}));
  protected readonly dash = computed(() => {
    const circumference = 2 * Math.PI * 50;
    const filled = ((this.result()?.overallScore ?? 0) / 100) * circumference;
    return `${filled} ${circumference}`;
  });
  protected readonly gaugeColor = computed(() => {
    const s = this.result()?.overallScore ?? 0;
    return s >= 75 ? 'var(--low)' : s >= 50 ? 'var(--attn)' : 'var(--high)';
  });

  constructor() {
    effect(() => {
      this.loading.set(true);
      this.api.latestAnalysis(this.id()).subscribe({
        next: (a) => {
          this.result.set(a);
          this.loading.set(false);
        },
        error: (e: unknown) => {
          // 404 only means "not analysed yet".
          if (!(e instanceof HttpErrorResponse && e.status === 404)) {
            this.error.set(problemMessage(e));
          }
          this.loading.set(false);
        },
      });
    });
  }

  protected sev(s: 'HIGH' | 'MEDIUM' | 'LOW'): Key {
    return `sev.${s}`;
  }

  protected run() {
    this.busy.set(true);
    this.error.set(null);
    this.api.analyze(this.id(), this.useAi()).subscribe({
      next: (a) => {
        this.result.set(a);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }
}
