import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, CvComparison, CvSummary, JobSummary, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';

@Component({
  selector: 'app-cv-compare',
  imports: [ReactiveFormsModule, RouterLink],
  styles: `
    .pick { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; align-items: end; }
    .sides { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; overflow-wrap: anywhere; }
    td.num { font-variant-numeric: tabular-nums; }
    ul { padding-left: 18px; display: grid; gap: 4px; }
  `,
  template: `
    <div class="stack">
      <div class="row between">
        <h1>{{ i18n.t('cmp.title') }}</h1>
        <a class="btn" routerLink="/app/cvs">{{ i18n.t('nav.cvs') }}</a>
      </div>
      <p class="muted">{{ i18n.t('cmp.lede') }}</p>
      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      <form class="card pick" [formGroup]="form" (ngSubmit)="run()">
        <label for="c-a">{{ i18n.t('cmp.a') }}
          <select id="c-a" formControlName="a">
            <option value="">–</option>
            @for (c of cvs(); track c.id) { <option [value]="c.id">{{ c.label }}</option> }
          </select>
        </label>
        <label for="c-b">{{ i18n.t('cmp.b') }}
          <select id="c-b" formControlName="b">
            <option value="">–</option>
            @for (c of cvs(); track c.id) { <option [value]="c.id">{{ c.label }}</option> }
          </select>
        </label>
        <label for="c-j">{{ i18n.t('cmp.job') }}
          <select id="c-j" formControlName="job">
            <option value="">{{ i18n.t('cmp.noJob') }}</option>
            @for (j of jobs(); track j.id) { <option [value]="j.id">{{ j.title }}{{ j.company ? ' · ' + j.company : '' }}</option> }
          </select>
        </label>
        <div><button class="btn primary" type="submit" [disabled]="!form.value.a || !form.value.b || form.value.a === form.value.b || busy()">{{ i18n.t('cmp.go') }}</button></div>
      </form>

      @if (result(); as r) {
        <section class="card stack-sm">
          <h2>{{ i18n.t('cmp.readability') }}</h2>
          <table>
            <thead><tr><th></th><th>{{ r.a.label }}</th><th>{{ r.b.label }}</th></tr></thead>
            <tbody>
              <tr><th scope="row">{{ i18n.t('cmp.words') }}</th><td class="num">{{ r.a.readability.words }}</td><td class="num">{{ r.b.readability.words }}</td></tr>
              <tr><th scope="row">{{ i18n.t('cmp.bullets') }}</th><td class="num">{{ r.a.readability.bullets }}</td><td class="num">{{ r.b.readability.bullets }}</td></tr>
              <tr><th scope="row">{{ i18n.t('cmp.avgBullet') }}</th><td class="num">{{ r.a.readability.averageBulletWords }}</td><td class="num">{{ r.b.readability.averageBulletWords }}</td></tr>
              <tr><th scope="row">{{ i18n.t('cmp.quantified') }}</th><td class="num">{{ r.a.readability.quantifiedBulletShare }}%</td><td class="num">{{ r.b.readability.quantifiedBulletShare }}%</td></tr>
              <tr><th scope="row">{{ i18n.t('cmp.longBullets') }}</th><td class="num">{{ r.a.readability.longBullets }}</td><td class="num">{{ r.b.readability.longBullets }}</td></tr>
              <tr><th scope="row">{{ i18n.t('cmp.sections') }}</th>
                <td>{{ sections(r.a.readability) }}</td><td>{{ sections(r.b.readability) }}</td></tr>
            </tbody>
          </table>
        </section>

        @if (r.job; as job) {
          <section class="card stack-sm">
            <h2>{{ i18n.t('cmp.vsJob', { title: job.title }) }}</h2>
            <div class="sides">
              @for (s of [r.a, r.b]; track s.cvId) {
                <div class="stack-sm">
                  <h3>{{ s.label }}</h3>
                  <p><strong>{{ s.matchScore ?? '–' }}</strong> / 100 · {{ i18n.t('cmp.matchScore') }}</p>
                  @if (s.coverage; as c) {
                    <p>{{ i18n.t('cmp.requiredCovered', { a: c.requiredCovered, b: c.required }) }}
                      · {{ i18n.t('cmp.preferredCovered', { a: c.preferredCovered, b: c.preferred }) }}</p>
                    @if (c.missingRequired.length > 0) { <p class="muted">{{ i18n.t('cmp.missing') }}: {{ c.missingRequired.join(', ') }}</p> }
                  }
                </div>
              }
            </div>
          </section>
        }

        <section class="card stack-sm">
          <h2>{{ i18n.t('cmp.facts') }}</h2>
          @if (r.differences.length === 0) {
            <p class="muted">{{ i18n.t('cmp.noDiff') }}</p>
          } @else {
            <p class="muted">{{ i18n.t('cmp.diffNote') }}</p>
            <table>
              <thead><tr><th>{{ i18n.t('cmp.what') }}</th><th>{{ r.a.label }}</th><th>{{ r.b.label }}</th></tr></thead>
              <tbody>
                @for (d of r.differences; track $index) {
                  <tr><th scope="row">{{ i18n.t(diffKey(d.code)) }}<br /><span class="muted">{{ d.subject }}</span></th><td>{{ d.a ?? '–' }}</td><td>{{ d.b ?? '–' }}</td></tr>
                }
              </tbody>
            </table>
          }
          @if (r.skillsOnlyInA.length > 0 || r.skillsOnlyInB.length > 0) {
            <h3>{{ i18n.t('cmp.skillDiff') }}</h3>
            <ul>
              @if (r.skillsOnlyInA.length > 0) { <li>{{ r.a.label }}: {{ r.skillsOnlyInA.join(', ') }}</li> }
              @if (r.skillsOnlyInB.length > 0) { <li>{{ r.b.label }}: {{ r.skillsOnlyInB.join(', ') }}</li> }
            </ul>
          }
        </section>
      }
    </div>
  `,
})
export class CvComparePage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);

  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly jobs = signal<JobSummary[]>([]);
  protected readonly result = signal<CvComparison | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({ a: [''], b: [''], job: [''] });

  constructor() {
    this.api.listCvs().subscribe({
      next: (l) => {
        this.cvs.set(l);
        if (l.length >= 2 && !this.form.value.a) {
          this.form.patchValue({ a: l[0].id, b: l[1].id });
        }
      },
      error: (e) => this.error.set(problemMessage(e)),
    });
    this.api
      .listJobs({ q: '', location: '', remote: '', sort: 'newest', cvId: null, minScore: null, postedWithinDays: null, minSalary: null, includeUnknownSalary: true, includeExpired: false, page: 0 })
      .subscribe({ next: (p) => this.jobs.set(p.items.slice(0, 30)), error: () => undefined });
    const job = this.route.snapshot.queryParamMap.get('job');
    if (job) {
      this.form.patchValue({ job });
    }
  }

  protected run() {
    const v = this.form.getRawValue();
    this.error.set(null);
    this.busy.set(true);
    this.api.compareCvs(v.a, v.b, v.job || null).subscribe({
      next: (r) => {
        this.result.set(r);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected sections(r: CvComparison['a']['readability']): string {
    const out: string[] = [];
    if (r.hasSummary) out.push(this.i18n.t('cmp.sec.summary'));
    if (r.hasSkills) out.push(this.i18n.t('cmp.sec.skills'));
    if (r.hasEducation) out.push(this.i18n.t('cmp.sec.education'));
    out.push(this.i18n.t('cmp.sec.experience', { n: r.experienceEntries }));
    return out.join(' · ');
  }

  protected diffKey(code: string): Key {
    return `cmp.diff.${code}` as Key;
  }
}
