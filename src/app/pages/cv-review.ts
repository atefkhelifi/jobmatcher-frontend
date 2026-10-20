import { Component, inject, input, signal, effect } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, CvDetail, ParsedCv, SkillEntry, problemMessage } from '../core/api';
import { I18n } from '../core/i18n';
import { downloadText } from '../shared/download';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

const lines = (s: string): string[] =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

const orNull = (s: string): string | null => (s.trim() ? s.trim() : null);

@Component({
  selector: 'app-cv-review',
  imports: [ReactiveFormsModule, RouterLink],
  styles: `
    .head { display: grid; gap: 12px; }
    .block { background: var(--surface-2); border-radius: var(--radius); padding: 16px; display: grid; gap: 12px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
    .sticky { position: sticky; bottom: 0; background: var(--bg); border-top: 1px solid var(--line); padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px)); display: flex; flex-wrap: wrap; gap: 12px; align-items: center; z-index: 2; }
    details pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 13px/1.5 var(--mono); max-height: 360px; overflow: auto; margin: 12px 0 0; }
    .invalid { color: var(--high); font-size: 12.5px; }
  `,
  template: `
    @if (loadError()) {
      <p class="banner error" role="alert">{{ loadError() }}</p>
    } @else if (!cv()) {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    } @else {
      <form class="stack" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="head">
          <a routerLink="/app/cvs" class="muted">← {{ i18n.t('nav.cvs') }}</a>
          <h1>{{ i18n.t('review.title') }}</h1>
          <p class="muted">{{ i18n.t('review.intro') }}</p>
          <div class="row">
            <a class="btn" [routerLink]="['/app/cvs', id(), 'analysis']">{{ i18n.t('review.analyze') }}</a>
            <button class="btn" type="button" (click)="exportMd()">{{ i18n.t('review.export') }}</button>
          </div>
        </div>

        @if (error()) {
          <p class="banner error" role="alert">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="banner ok" role="status">{{ i18n.t('review.saved') }}</p>
        }

        <section class="card">
          <h2>{{ i18n.t('review.identity') }}</h2>
          <label for="label">{{ i18n.t('cv.label') }}<input id="label" type="text" formControlName="label" maxlength="160" /></label>
          <div class="cols">
            <label for="fullName">{{ i18n.t('review.fullName') }}<input id="fullName" type="text" formControlName="fullName" /></label>
            <label for="email">{{ i18n.t('review.email') }}<input id="email" type="email" formControlName="email" /></label>
            <label for="phone">{{ i18n.t('review.phone') }}<input id="phone" type="text" formControlName="phone" /></label>
          </div>
          <label for="summary">{{ i18n.t('review.summary') }}<textarea id="summary" rows="4" formControlName="summary"></textarea></label>
          <p class="hint">{{ i18n.t('review.years') }}: <strong>{{ cv()!.parsed.yearsOfExperience ?? i18n.t('common.unknown') }}</strong></p>
        </section>

        <section class="card">
          <h2>{{ i18n.t('review.skills') }}</h2>
          <label for="skills">{{ i18n.t('review.skills.hint') }}<textarea id="skills" rows="6" formControlName="skills"></textarea></label>
        </section>

        <section class="card">
          <div class="row between">
            <h2>{{ i18n.t('review.experience') }}</h2>
            <button class="btn small" type="button" (click)="addRole()">+ {{ i18n.t('review.addRole') }}</button>
          </div>
          @for (g of experience.controls; track g; let i = $index) {
            <div class="block" [formGroup]="g">
              <div class="cols">
                <label [for]="'role-' + i">{{ i18n.t('review.role') }}<input [id]="'role-' + i" type="text" formControlName="title" /></label>
                <label [for]="'co-' + i">{{ i18n.t('review.company') }}<input [id]="'co-' + i" type="text" formControlName="company" /></label>
                <label [for]="'st-' + i">{{ i18n.t('review.start') }}<input [id]="'st-' + i" type="text" formControlName="start" placeholder="2021-03" /></label>
                <label [for]="'en-' + i">{{ i18n.t('review.end') }}<input [id]="'en-' + i" type="text" formControlName="end" placeholder="2024-06" /></label>
              </div>
              @if (g.controls['start'].invalid || g.controls['end'].invalid) {
                <p class="invalid" role="alert">YYYY-MM</p>
              }
              <label class="check" [for]="'cur-' + i"><input [id]="'cur-' + i" type="checkbox" formControlName="current" /> {{ i18n.t('review.current') }}</label>
              <label [for]="'bu-' + i">{{ i18n.t('review.bullets') }}<textarea [id]="'bu-' + i" rows="5" formControlName="bullets"></textarea></label>
              <div><button class="btn small danger" type="button" (click)="experience.removeAt(i); form.markAsDirty()">{{ i18n.t('review.remove') }}</button></div>
            </div>
          }
        </section>

        <section class="card">
          <div class="row between">
            <h2>{{ i18n.t('review.education') }}</h2>
            <button class="btn small" type="button" (click)="addEducation()">+ {{ i18n.t('review.addEdu') }}</button>
          </div>
          @for (g of education.controls; track g; let i = $index) {
            <div class="block" [formGroup]="g">
              <div class="cols">
                <label [for]="'dg-' + i">{{ i18n.t('review.degree') }}<input [id]="'dg-' + i" type="text" formControlName="degree" /></label>
                <label [for]="'in-' + i">{{ i18n.t('review.institution') }}<input [id]="'in-' + i" type="text" formControlName="institution" /></label>
                <label [for]="'es-' + i">{{ i18n.t('review.start') }} (YYYY)<input [id]="'es-' + i" type="text" formControlName="start" placeholder="2014" /></label>
                <label [for]="'ee-' + i">{{ i18n.t('review.end') }} (YYYY)<input [id]="'ee-' + i" type="text" formControlName="end" placeholder="2016" /></label>
              </div>
              @if (g.controls['start'].invalid || g.controls['end'].invalid) {
                <p class="invalid" role="alert">YYYY</p>
              }
              <div><button class="btn small danger" type="button" (click)="education.removeAt(i); form.markAsDirty()">{{ i18n.t('review.remove') }}</button></div>
            </div>
          }
        </section>

        <section class="card">
          <div class="row between">
            <h2>{{ i18n.t('review.languages') }}</h2>
            <button class="btn small" type="button" (click)="addLanguage()">+ {{ i18n.t('review.addLang') }}</button>
          </div>
          @for (g of languages.controls; track g; let i = $index) {
            <div class="block" [formGroup]="g">
              <div class="cols">
                <label [for]="'lg-' + i">{{ i18n.t('review.language') }}<input [id]="'lg-' + i" type="text" formControlName="language" /></label>
                <label [for]="'lv-' + i">{{ i18n.t('review.level') }}<input [id]="'lv-' + i" type="text" formControlName="level" placeholder="C1" /></label>
              </div>
              <div><button class="btn small danger" type="button" (click)="languages.removeAt(i); form.markAsDirty()">{{ i18n.t('review.remove') }}</button></div>
            </div>
          }
        </section>

        <section class="card">
          <label for="certs">{{ i18n.t('review.certs') }}<textarea id="certs" rows="3" formControlName="certifications"></textarea></label>
          <label for="projects">{{ i18n.t('review.projects') }}<textarea id="projects" rows="3" formControlName="projects"></textarea></label>
        </section>

        <section class="card">
          <details>
            <summary>{{ i18n.t('review.source') }}</summary>
            <pre>{{ cv()!.text }}</pre>
          </details>
        </section>

        <div class="sticky">
          <button class="btn primary" type="submit" [disabled]="form.invalid || busy()">
            @if (busy()) { <span class="spinner"></span> {{ i18n.t('review.saving') }} } @else { {{ i18n.t('review.save') }} }
          </button>
          @if (form.dirty && !busy()) {
            <span class="chip med">{{ i18n.t('review.unsaved') }}</span>
          }
        </div>
      </form>
    }
  `,
})
export class CvReview {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Bound from the route parameter. */
  readonly id = input.required<string>();

  protected readonly cv = signal<CvDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);
  protected readonly busy = signal(false);

  protected readonly experience = this.fb.array([] as ReturnType<CvReview['roleGroup']>[]);
  protected readonly education = this.fb.array([] as ReturnType<CvReview['eduGroup']>[]);
  protected readonly languages = this.fb.array([] as ReturnType<CvReview['langGroup']>[]);

  protected readonly form = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(160)]],
    fullName: [''],
    email: ['', Validators.email],
    phone: [''],
    summary: ['', Validators.maxLength(3000)],
    skills: [''],
    experience: this.experience,
    education: this.education,
    languages: this.languages,
    certifications: [''],
    projects: [''],
  });

  constructor() {
    effect(() => {
      this.api.getCv(this.id()).subscribe({
        next: (d) => this.load(d),
        error: (e) => this.loadError.set(problemMessage(e)),
      });
    });
  }

  private roleGroup(r?: ParsedCv['experience'][number]) {
    return this.fb.group({
      title: [r?.title ?? ''],
      company: [r?.company ?? ''],
      start: [r?.start ?? '', Validators.pattern(MONTH)],
      end: [r?.end ?? '', Validators.pattern(MONTH)],
      current: [r?.current ?? false],
      bullets: [(r?.bullets ?? []).join('\n')],
    });
  }

  private eduGroup(e?: ParsedCv['education'][number]) {
    return this.fb.group({
      degree: [e?.degree ?? ''],
      institution: [e?.institution ?? ''],
      start: [e?.start ?? '', Validators.pattern(YEAR)],
      end: [e?.end ?? '', Validators.pattern(YEAR)],
    });
  }

  private langGroup(l?: ParsedCv['languages'][number]) {
    return this.fb.group({ language: [l?.language ?? ''], level: [l?.level ?? ''] });
  }

  protected addRole() {
    this.experience.push(this.roleGroup());
    this.form.markAsDirty();
  }
  protected addEducation() {
    this.education.push(this.eduGroup());
    this.form.markAsDirty();
  }
  protected addLanguage() {
    this.languages.push(this.langGroup());
    this.form.markAsDirty();
  }

  private load(d: CvDetail) {
    const p = d.parsed;
    this.cv.set(d);
    this.experience.clear();
    this.education.clear();
    this.languages.clear();
    p.experience.forEach((r) => this.experience.push(this.roleGroup(r)));
    p.education.forEach((e) => this.education.push(this.eduGroup(e)));
    p.languages.forEach((l) => this.languages.push(this.langGroup(l)));
    this.form.patchValue({
      label: d.summary.label,
      fullName: p.fullName ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      summary: p.summary ?? '',
      skills: p.skills.map((s) => s.name).join('\n'),
      certifications: p.certifications.join('\n'),
      projects: p.projects.join('\n'),
    });
    this.form.markAsPristine();
  }

  private toParsed(): ParsedCv {
    const v = this.form.getRawValue();
    const known = new Map((this.cv()?.parsed.skills ?? []).map((s) => [s.name.toLowerCase(), s]));
    const seen = new Set<string>();
    const skills: SkillEntry[] = [];
    for (const name of lines(v.skills)) {
      if (seen.has(name.toLowerCase())) {
        continue;
      }
      seen.add(name.toLowerCase());
      skills.push(known.get(name.toLowerCase()) ?? { name, category: 'other', evidence: 'Added by you' });
    }
    return {
      fullName: orNull(v.fullName),
      email: orNull(v.email),
      phone: orNull(v.phone),
      summary: orNull(v.summary),
      skills,
      experience: v.experience.map((r) => ({
        title: orNull(r.title),
        company: orNull(r.company),
        start: orNull(r.start),
        end: r.current ? null : orNull(r.end),
        current: r.current,
        bullets: lines(r.bullets),
      })),
      education: v.education.map((e) => ({
        degree: orNull(e.degree),
        institution: orNull(e.institution),
        start: orNull(e.start),
        end: orNull(e.end),
      })),
      languages: v.languages.filter((l) => l.language.trim()).map((l) => ({ language: l.language.trim(), level: orNull(l.level) })),
      certifications: lines(v.certifications),
      projects: lines(v.projects),
      yearsOfExperience: this.cv()?.parsed.yearsOfExperience ?? null,
    };
  }

  protected save() {
    if (this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.saved.set(false);
    this.api.saveCv(this.id(), this.form.getRawValue().label, this.toParsed()).subscribe({
      next: (d) => {
        this.load(d);
        this.saved.set(true);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected exportMd() {
    this.api.exportCvMarkdown(this.id()).subscribe({
      next: (md) => downloadText(md, 'cv.md', 'text/markdown'),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }
}
