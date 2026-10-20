import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatchNote, MatchView } from '../core/api';
import { I18n, Key } from '../core/i18n';

const LEVELS: Record<string, Key> = { junior: 'pref.junior', mid: 'pref.mid', senior: 'pref.senior', lead: 'pref.lead' };

/** Renders the explanation behind a score. Everything shown comes from the report; nothing is added here. */
@Component({
  selector: 'app-match-report',
  imports: [RouterLink],
  styles: `
    .top { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; }
    @media (max-width: 560px) { .top { grid-template-columns: 1fr; } }
    .gauge { width: 132px; height: 132px; }
    .gauge text { fill: var(--fg); }
    ul.plain { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
    .crit { display: grid; grid-template-columns: minmax(130px, 200px) 1fr; gap: 6px 16px; padding: 10px 0; border-top: 1px solid var(--line); align-items: center; }
    .crit:first-of-type { border-top: 0; }
    .crit .name { font-weight: 600; }
    .bar { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
    .bar > i { display: block; height: 100%; background: var(--accent); }
    .bar.unknown { background: repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 6px, transparent 6px, transparent 12px); }
    .detail { grid-column: 2; color: var(--muted); font-size: 13.5px; }
    @media (max-width: 560px) { .crit { grid-template-columns: 1fr; } .detail { grid-column: 1; } }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { display: inline-flex; gap: 6px; align-items: baseline; border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; font-size: 14px; background: var(--surface); }
    .skill.yes { border-color: var(--low); }
    .skill.no { border-color: var(--high); }
    .skill small { color: var(--muted); }
    blockquote { margin: 4px 0 0; padding: 6px 12px; border-left: 3px solid var(--line); background: var(--surface-2); font-size: 14px; overflow-wrap: anywhere; }
    .exp { display: grid; gap: 4px; padding-top: 10px; border-top: 1px solid var(--line); }
    .exp:first-of-type { border-top: 0; padding-top: 0; }
  `,
  template: `
    @if (view(); as v) {
      @if (part() === 'analysis') {
        <div class="stack">
          <section class="card">
            <div class="top">
              <svg class="gauge" viewBox="0 0 120 120" role="img" [attr.aria-label]="i18n.t('match.score') + ': ' + (v.report.score ?? '—')">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="10" />
                @if (v.report.score !== null) {
                  <circle cx="60" cy="60" r="50" fill="none" [attr.stroke]="color()" stroke-width="10" stroke-linecap="round"
                    [attr.stroke-dasharray]="dash()" transform="rotate(-90 60 60)" />
                }
                <text x="60" y="66" text-anchor="middle" font-size="30" font-weight="700" style="font-family: var(--display)">{{ v.report.score ?? '—' }}</text>
                <text x="60" y="84" text-anchor="middle" font-size="10" style="font-family: var(--mono)">/ 100</text>
              </svg>
              <div class="stack-sm">
                <h2>{{ i18n.t('match.score') }}</h2>
                @if (v.report.insufficientData) {
                  <p class="banner attn">{{ i18n.t('match.insufficient') }}</p>
                } @else {
                  <p class="muted">{{ i18n.t('match.coverage', { pct: v.report.coverage }) }}</p>
                  @if (v.report.coverage < 40) { <p class="banner attn">{{ i18n.t('match.lowCoverage') }}</p> }
                }
                <p class="hint">{{ i18n.t('match.disclaimer') }}</p>
                @if (!v.report.cvReviewed) { <p class="banner attn">{{ i18n.t('match.reviewHint') }}</p> }
              </div>
            </div>
          </section>

          @if (v.report.blockers.length) {
            <section class="card">
              <h2>{{ i18n.t('match.blockers') }}</h2>
              <ul class="plain">@for (b of v.report.blockers; track $index) { <li>{{ text(b) }}</li> }</ul>
            </section>
          }

          <section class="card">
            <h2>{{ i18n.t('match.criteria') }}</h2>
            @for (c of v.report.components; track c.key) {
              <div class="crit">
                <div class="name">{{ i18n.t(label(c.key)) }} <span class="hint">· {{ i18n.t('match.weight') }} {{ c.weight }}</span></div>
                <div>
                  @if (c.score !== null) {
                    <div class="bar" role="img" [attr.aria-label]="pct(c.score)"><i [style.width.%]="c.score * 100"></i></div>
                  } @else {
                    <div class="bar unknown" role="img" [attr.aria-label]="i18n.t('match.unknown')"></div>
                  }
                </div>
                <div class="detail">{{ c.score === null ? i18n.t('match.unknown') + '. ' : '' }}{{ text(c.detail) }}@if (c.score !== null && c.confidence < 1) { <em> {{ i18n.t('match.lowEvidence') }}</em> }</div>
              </div>
            }
          </section>

          <section class="card">
            <h2>{{ i18n.t('match.skills.required') }}</h2>
            <div class="skills">
              @for (s of requiredSkills(); track s.skill) {
                <span class="skill" [class.yes]="s.matched" [class.no]="!s.matched" [title]="s.inferred ? i18n.t('match.skill.inferred') : ''">
                  {{ s.matched ? '✓' : '✗' }} {{ s.skill }}@if (s.inferred) { <small>?</small> }
                </span>
              } @empty { <span class="muted">{{ i18n.t('match.none') }}</span> }
            </div>
            <h2>{{ i18n.t('match.skills.preferred') }}</h2>
            <div class="skills">
              @for (s of preferredSkills(); track s.skill) {
                <span class="skill" [class.yes]="s.matched" [title]="s.inferred ? i18n.t('match.skill.inferred') : ''">
                  {{ s.matched ? '✓' : '–' }} {{ s.skill }}@if (s.inferred) { <small>?</small> }
                </span>
              } @empty { <span class="muted">{{ i18n.t('match.none') }}</span> }
            </div>
            <p class="hint">? {{ i18n.t('match.skill.inferred') }}</p>
          </section>

          <div class="grid-2">
            <section class="card">
              <h2>{{ i18n.t('match.strengths') }}</h2>
              <ul class="plain">@for (n of v.report.strengths; track $index) { <li>{{ text(n) }}</li> } @empty { <li class="muted">{{ i18n.t('match.none') }}</li> }</ul>
            </section>
            <section class="card">
              <h2>{{ i18n.t('match.gaps') }}</h2>
              <ul class="plain">@for (n of v.report.gaps; track $index) { <li>{{ text(n) }}</li> } @empty { <li class="muted">{{ i18n.t('match.none') }}</li> }</ul>
            </section>
          </div>

          <section class="card">
            <h2>{{ i18n.t('match.experience') }}</h2>
            @for (e of v.report.relevantExperience; track $index) {
              <article class="exp">
                <strong>{{ e.title || i18n.t('common.unknown') }}@if (e.company) { · {{ e.company }} }</strong>
                <span class="hint">{{ e.start || '?' }} – {{ e.current ? i18n.t('common.present') : (e.end || '?') }} · {{ e.skills.join(', ') }}</span>
                @if (e.quote) { <blockquote>{{ e.quote }}</blockquote> }
              </article>
            } @empty { <p class="muted">{{ i18n.t('match.none') }}</p> }
          </section>
        </div>
      } @else {
        <div class="stack">
          <section class="card">
            <h2>{{ i18n.t('match.adjust') }}</h2>
            <p class="muted">{{ i18n.t('match.adjust.note') }}</p>
            <ul class="plain">@for (n of v.report.cvAdjustments; track $index) { <li>{{ text(n) }}</li> } @empty { <li class="muted">{{ i18n.t('match.adjust.none') }}</li> }</ul>
            <div><a class="btn" [routerLink]="['/app/cvs', v.cvId]">{{ i18n.t('match.adjust.edit') }}</a></div>
          </section>
          <section class="card">
            <h2>{{ i18n.t('match.learning') }}</h2>
            <ul class="plain">
              @for (l of v.report.learningPriorities; track l.skill) {
                <li>{{ i18n.t('match.learn', { skill: l.skill, level: i18n.t(levelKey(l.level)), mentions: l.mentions }) }}</li>
              } @empty { <li class="muted">{{ i18n.t('match.learning.none') }}</li> }
            </ul>
          </section>
        </div>
      }
    }
  `,
})
export class MatchReportView {
  protected readonly i18n = inject(I18n);

  readonly view = input.required<MatchView | null>();
  readonly part = input<'analysis' | 'cv'>('analysis');

  protected readonly requiredSkills = computed(() => this.view()?.report.skills.filter((s) => s.level === 'REQUIRED') ?? []);
  protected readonly preferredSkills = computed(() => this.view()?.report.skills.filter((s) => s.level === 'PREFERRED') ?? []);
  protected readonly dash = computed(() => {
    const c = 2 * Math.PI * 50;
    return `${((this.view()?.report.score ?? 0) / 100) * c} ${c}`;
  });
  protected readonly color = computed(() => {
    const s = this.view()?.report.score ?? 0;
    return s >= 75 ? 'var(--low)' : s >= 50 ? 'var(--attn)' : 'var(--high)';
  });

  protected pct(score: number): string {
    return `${Math.round(score * 100)}%`;
  }
  protected label(key: string): Key {
    return `mc.${key}` as Key;
  }
  protected levelKey(level: string): Key {
    return `match.level.${level}` as Key;
  }

  protected text(n: MatchNote): string {
    const p: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(n.params)) {
      p[k] = v === null ? '' : typeof v === 'boolean' ? String(v) : v;
    }
    if (n.code === 'contract.some') {
      p['contract'] = this.i18n.t(`cs.${p['contract']}` as Key);
      p['salary'] = this.i18n.t(`cs.${p['salary']}` as Key);
    }
    if (n.code === 'experience.seniority') {
      for (const k of ['job', 'you']) {
        const key = LEVELS[String(p[k])];
        if (key) p[k] = this.i18n.t(key);
      }
    }
    return this.i18n.t(n.code as Key, p);
  }
}
