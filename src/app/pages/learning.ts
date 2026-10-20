import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, CvSummary, LearningPlan, problemMessage } from '../core/api';
import { I18n } from '../core/i18n';
import { SelectedCv } from '../core/selected-cv';
import { safeUrl } from '../shared/format';

@Component({
  selector: 'app-learning',
  imports: [RouterLink],
  styles: `
    ol { list-style: none; padding: 0; display: grid; gap: 12px; }
    li.item { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; display: grid; gap: 6px; }
    ul { padding-left: 18px; display: grid; gap: 4px; margin: 0; }
  `,
  template: `
    <div class="stack">
      <h1>{{ i18n.t('learn.title') }}</h1>
      <p class="muted">{{ i18n.t('learn.lede') }}</p>
      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      @if (cvs().length === 0 && loaded()) {
        <p class="muted">{{ i18n.t('match.noCv') }} <a routerLink="/app/cvs">{{ i18n.t('nav.cvs') }}</a></p>
      } @else if (cvs().length > 0) {
        <div class="card row">
          <label for="l-cv">{{ i18n.t('match.cv') }}</label>
          <select id="l-cv" (change)="choose($any($event.target).value)">
            @for (c of cvs(); track c.id) { <option [value]="c.id" [selected]="c.id === selected.id()">{{ c.label }}</option> }
          </select>
        </div>
      }

      @if (plan(); as p) {
        @if (p.jobsConsidered === 0) {
          <p class="muted">{{ i18n.t('learn.noJobs') }} <a routerLink="/app/jobs">{{ i18n.t('nav.jobs') }}</a></p>
        } @else if (p.items.length === 0) {
          <p>{{ i18n.t('learn.noGaps', { n: p.jobsConsidered }) }}</p>
        } @else {
          <p class="muted">{{ i18n.t('learn.basis', { n: p.jobsConsidered }) }}</p>
          <ol>
            @for (it of p.items; track it.skill) {
              <li class="item">
                <h2>{{ it.skill }}</h2>
                <p>{{ i18n.t('learn.demand', { jobs: it.jobs, req: it.requiredIn, pref: it.preferredIn }) }}</p>
                @if (it.resources.length === 0) {
                  <p class="muted">{{ i18n.t('learn.noResource') }}</p>
                } @else {
                  <ul>
                    @for (r of it.resources; track r.url) {
                      <li>
                        @if (link(r.url); as href) { <a [href]="href" target="_blank" rel="noopener noreferrer">{{ r.title }} ↗</a> }
                        <span class="muted"> · {{ r.provider }} · {{ r.kind }}</span>
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ol>
          <p class="hint">{{ i18n.t('learn.honest') }}</p>
        }
      }
    </div>
  `,
})
export class LearningPage {
  protected readonly i18n = inject(I18n);
  protected readonly selected = inject(SelectedCv);
  private readonly api = inject(Api);

  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly loaded = signal(false);
  protected readonly plan = signal<LearningPlan | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.listCvs().subscribe({
      next: (c) => {
        this.cvs.set(c);
        this.loaded.set(true);
        if (!c.some((x) => x.id === this.selected.id())) {
          this.selected.select(c[0]?.id ?? null);
        }
        this.load();
      },
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected choose(id: string) {
    this.selected.select(id);
    this.load();
  }

  private load() {
    const cv = this.selected.id();
    this.plan.set(null);
    if (!cv) {
      return;
    }
    this.api.learningPlan(cv).subscribe({
      next: (p) => this.plan.set(p),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected link(u: string): string | null {
    return safeUrl(u);
  }
}
