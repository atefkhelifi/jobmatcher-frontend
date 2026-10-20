import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Api, InterviewPrep, InterviewQuestion, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { safeUrl } from './format';

type Rating = 'confident' | 'ok' | 'revise';

/**
 * Interview preparation for one job. The questions come from the ad and the scaffolds from the CV; the user writes the answers.
 * Mock mode keeps what is typed in memory only: nothing is sent to the server or stored.
 */
@Component({
  selector: 'app-interview-prep',
  styles: `
    .q { display: grid; gap: 8px; padding: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; }
    .q h3 { font-size: 16px; }
    blockquote { margin: 0; padding: 8px 12px; border-left: 3px solid var(--accent); background: var(--surface-2); }
    ul { padding-left: 18px; display: grid; gap: 4px; margin: 0; }
    textarea { min-height: 120px; }
    .kind { font: 600 11px var(--mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  `,
  template: `
    @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
    @if (loading()) { <p class="muted"><span class="spinner"></span> {{ i18n.t('common.loading') }}</p> }
    @if (prep(); as p) {
      <section class="card stack-sm">
        <div class="row between">
          <h2>{{ i18n.t('prep.title') }}</h2>
          @if (mock() === null) {
            <button class="btn primary" type="button" (click)="startMock()">{{ i18n.t('prep.mock.start') }}</button>
          } @else {
            <button class="btn" type="button" (click)="stopMock()">{{ i18n.t('prep.mock.stop') }}</button>
          }
        </div>
        <p class="muted">{{ i18n.t('prep.lede') }}</p>
        @if (!p.cvReviewed) { <p class="banner attn">{{ i18n.t('prep.unreviewed') }}</p> }
      </section>

      @if (mock(); as m) {
        @if (m.index < p.questions.length) {
          <section class="card stack-sm" aria-live="polite">
            <p class="muted">{{ i18n.t('prep.mock.progress', { n: m.index + 1, total: p.questions.length }) }}</p>
            <div class="q">
              <span class="kind">{{ i18n.t(kindKey(p.questions[m.index])) }}</span>
              <h3>{{ p.questions[m.index].text }}</h3>
              <label for="mock-a">{{ i18n.t('prep.mock.yourAnswer') }}<textarea id="mock-a" [value]="m.answer" (input)="setAnswer($any($event.target).value)"></textarea></label>
              <p class="hint">{{ i18n.t('prep.mock.private') }}</p>
              @if (!m.hints) {
                <div><button class="btn small" type="button" (click)="showHints()">{{ i18n.t('prep.mock.hints') }}</button></div>
              } @else {
                <ng-container [ngTemplateOutlet]="detail" [ngTemplateOutletContext]="{ q: p.questions[m.index] }" />
              }
              <div class="row">
                <span>{{ i18n.t('prep.mock.rate') }}</span>
                <button class="btn small" type="button" (click)="rate('confident')">{{ i18n.t('prep.rate.confident') }}</button>
                <button class="btn small" type="button" (click)="rate('ok')">{{ i18n.t('prep.rate.ok') }}</button>
                <button class="btn small" type="button" (click)="rate('revise')">{{ i18n.t('prep.rate.revise') }}</button>
              </div>
            </div>
          </section>
        } @else {
          <section class="card stack-sm">
            <h2>{{ i18n.t('prep.mock.done') }}</h2>
            @if (toRevise().length === 0) {
              <p>{{ i18n.t('prep.mock.allGood') }}</p>
            } @else {
              <p>{{ i18n.t('prep.mock.toRevise') }}</p>
              <ul>@for (q of toRevise(); track q.id) { <li>{{ q.text }}</li> }</ul>
            }
          </section>
        }
      } @else {
        <section class="stack-sm">
          @for (q of p.questions; track q.id) {
            <article class="q">
              <span class="kind">{{ i18n.t(kindKey(q)) }}</span>
              <h3>{{ q.text }}</h3>
              <ng-container [ngTemplateOutlet]="detail" [ngTemplateOutletContext]="{ q }" />
            </article>
          }
        </section>
      }

      @if (p.revision.length > 0) {
        <section class="card stack-sm">
          <h2>{{ i18n.t('prep.revision') }}</h2>
          <ul>
            @for (r of p.revision; track r.skill) {
              <li>
                <strong>{{ r.skill }}</strong> · {{ i18n.t(r.shownOnCv ? 'prep.shown' : 'prep.notShown') }}
                @for (res of r.resources; track res.url) {
                  @if (link(res.url); as href) { · <a [href]="href" target="_blank" rel="noopener noreferrer">{{ res.title }} ↗</a> }
                }
              </li>
            }
          </ul>
        </section>
      }
    }

    <ng-template #detail let-q="q">
      @if (q.evidence) {
        <div>
          <strong>{{ i18n.t('prep.fromCv') }}</strong>
          <blockquote>{{ q.evidence }}</blockquote>
          @if (q.weakEvidence) { <p class="hint">{{ i18n.t('prep.weak') }}</p> }
        </div>
      }
      @if (q.scaffold.length > 0) {
        <div>
          <strong>{{ i18n.t(q.kind === 'GAP' ? 'prep.gapFrame' : 'prep.frame') }}</strong>
          <ul>@for (s of q.scaffold; track s) { <li>{{ s }}</li> }</ul>
        </div>
      }
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
})
export class InterviewPrepPanel {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);

  readonly jobId = input.required<string>();
  readonly cvId = input.required<string | null>();

  protected readonly prep = signal<InterviewPrep | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mock = signal<{ index: number; answer: string; hints: boolean } | null>(null);
  private readonly ratings = signal<Record<string, Rating>>({});

  constructor() {
    effect(() => {
      const cv = this.cvId();
      const lang = this.i18n.lang();
      const job = this.jobId();
      this.prep.set(null);
      this.mock.set(null);
      if (!cv) {
        return;
      }
      this.loading.set(true);
      this.error.set(null);
      this.api.getInterviewPrep(job, cv, lang).subscribe({
        next: (p) => {
          this.prep.set(p);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(problemMessage(e));
          this.loading.set(false);
        },
      });
    });
  }

  protected startMock() {
    this.ratings.set({});
    this.mock.set({ index: 0, answer: '', hints: false });
  }
  protected stopMock() {
    this.mock.set(null);
  }
  protected setAnswer(v: string) {
    this.mock.update((m) => (m ? { ...m, answer: v } : m));
  }
  protected showHints() {
    this.mock.update((m) => (m ? { ...m, hints: true } : m));
  }
  protected rate(r: Rating) {
    const m = this.mock();
    const p = this.prep();
    if (!m || !p || m.index >= p.questions.length) {
      return;
    }
    this.ratings.update((x) => ({ ...x, [p.questions[m.index].id]: r }));
    this.mock.set({ index: m.index + 1, answer: '', hints: false });
  }
  protected toRevise(): InterviewQuestion[] {
    const r = this.ratings();
    return (this.prep()?.questions ?? []).filter((q) => r[q.id] === 'revise');
  }
  protected kindKey(q: InterviewQuestion): Key {
    return `prep.kind.${q.kind}` as Key;
  }
  protected link(u: string): string | null {
    return safeUrl(u);
  }
}
