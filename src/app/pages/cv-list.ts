import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, CvSummary, problemMessage } from '../core/api';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-cv-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  styles: `
    .cv { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; align-items: center; padding: 14px 0; border-top: 1px solid var(--line); }
    .cv:first-child { border-top: 0; }
    .cv h3 { overflow-wrap: anywhere; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 6px; font-size: 13px; color: var(--muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    @media (max-width: 640px) { .cv { grid-template-columns: 1fr; } .actions { justify-content: flex-start; } }
    .file { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .file span { font-size: 14px; color: var(--muted); overflow-wrap: anywhere; }
    input[type='file'] { display: none; }
  `,
  template: `
    <div class="stack">
      <h1>{{ i18n.t('cv.title') }}</h1>

      @if (error()) {
        <p class="banner error" role="alert">{{ error() }}</p>
      }

      <div class="grid-2">
        <form class="card" [formGroup]="fileForm" (ngSubmit)="upload()">
          <h2>{{ i18n.t('cv.upload') }}</h2>
          <p class="hint">{{ i18n.t('cv.upload.hint') }}</p>
          <div class="file">
            <button class="btn" type="button" (click)="fileInput.click()">{{ i18n.t('cv.choose') }}</button>
            <span>{{ file()?.name ?? i18n.t('cv.noFile') }}</span>
            <input #fileInput type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" (change)="pick($event)" />
          </div>
          <label for="up-label">{{ i18n.t('cv.label') }}
            <input id="up-label" type="text" formControlName="label" [placeholder]="i18n.t('cv.label.ph')" maxlength="160" />
          </label>
          <button class="btn primary" type="submit" [disabled]="!file() || busy()">
            @if (busy() && mode() === 'file') { <span class="spinner"></span> {{ i18n.t('cv.adding') }} } @else { {{ i18n.t('cv.add') }} }
          </button>
        </form>

        <form class="card" [formGroup]="textForm" (ngSubmit)="paste()">
          <h2>{{ i18n.t('cv.paste') }}</h2>
          <label for="tx-label">{{ i18n.t('cv.label') }}
            <input id="tx-label" type="text" formControlName="label" [placeholder]="i18n.t('cv.label.ph')" maxlength="160" />
          </label>
          <label for="tx-text">{{ i18n.t('cv.text') }}
            <textarea id="tx-text" formControlName="text" rows="6"></textarea>
          </label>
          <button class="btn primary" type="submit" [disabled]="textForm.invalid || busy()">
            @if (busy() && mode() === 'text') { <span class="spinner"></span> {{ i18n.t('cv.adding') }} } @else { {{ i18n.t('cv.add') }} }
          </button>
        </form>
      </div>

      <section class="card">
        @if (loading()) {
          <p class="muted">{{ i18n.t('common.loading') }}</p>
        } @else if (cvs().length === 0) {
          <p class="muted">{{ i18n.t('cv.empty') }}</p>
        } @else {
          @if (cvs().length >= 2) {
            <p><a class="btn small" routerLink="/app/cvs/compare">{{ i18n.t('cmp.open') }}</a></p>
          }
          @for (cv of cvs(); track cv.id) {
            <article class="cv">
              <div>
                <h3>{{ cv.label }}</h3>
                <div class="meta">
                  <span class="chip neutral">{{ cv.sourceType }}</span>
                  <span class="chip" [class.low]="cv.reviewed" [class.med]="!cv.reviewed">{{ cv.reviewed ? i18n.t('cv.reviewed') : i18n.t('cv.toReview') }}</span>
                  <span>{{ i18n.t('cv.added', { date: (cv.createdAt | date: 'mediumDate') ?? '' }) }}</span>
                </div>
              </div>
              <div class="actions">
                <a class="btn small primary" [routerLink]="['/app/cvs', cv.id]">{{ i18n.t('cv.open') }}</a>
                <a class="btn small" [routerLink]="['/app/cvs', cv.id, 'analysis']">{{ i18n.t('cv.analysis') }}</a>
                @if (confirming() === cv.id) {
                  <button class="btn small danger" type="button" (click)="remove(cv.id)">{{ i18n.t('cv.delete.yes') }}</button>
                  <button class="btn small" type="button" (click)="confirming.set(null)">{{ i18n.t('cv.cancel') }}</button>
                } @else {
                  <button class="btn small" type="button" (click)="confirming.set(cv.id)">{{ i18n.t('cv.delete') }}</button>
                }
              </div>
            </article>
          }
        }
      </section>
    </div>
  `,
})
export class CvList {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly cvs = signal<CvSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly mode = signal<'file' | 'text'>('file');
  protected readonly error = signal<string | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly confirming = signal<string | null>(null);

  protected readonly fileForm = this.fb.group({ label: [''] });
  protected readonly textForm = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(160)]],
    text: ['', [Validators.required, Validators.minLength(50)]],
  });

  constructor() {
    this.refresh();
  }

  private refresh() {
    this.api.listCvs().subscribe({
      next: (c) => {
        this.cvs.set(c);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected pick(ev: Event) {
    this.file.set((ev.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected upload() {
    const f = this.file();
    if (!f) {
      return;
    }
    this.run('file', this.api.uploadCv(f, this.fileForm.controls.label.value));
  }

  protected paste() {
    const v = this.textForm.getRawValue();
    this.run('text', this.api.createCvFromText(v.label, v.text));
  }

  private run(mode: 'file' | 'text', request: ReturnType<Api['uploadCv']>) {
    this.mode.set(mode);
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (d) => this.router.navigate(['/app/cvs', d.summary.id]),
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected remove(id: string) {
    this.api.deleteCv(id).subscribe({
      next: () => {
        this.confirming.set(null);
        this.cvs.update((l) => l.filter((c) => c.id !== id));
      },
      error: (e) => this.error.set(problemMessage(e)),
    });
  }
}
