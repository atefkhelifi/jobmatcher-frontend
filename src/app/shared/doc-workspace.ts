import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Api, DocSummary, DocView, Formality, Length, Tone, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { downloadBlob } from './download';

/**
 * Writes, edits and exports one kind of document (cover letter or application email) for one offer. Versions are kept,
 * edits are saved as new versions, and anything in the text that is not in the CV or the offer is flagged.
 */
@Component({
  selector: 'app-doc-workspace',
  imports: [ReactiveFormsModule, DatePipe],
  styles: `
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 12px; }
    .editor { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 320px); gap: 20px; align-items: start; }
    @media (max-width: 860px) { .editor { grid-template-columns: 1fr; } }
    textarea.doc { min-height: 380px; font: 14.5px/1.65 var(--body); white-space: pre-wrap; }
    .versions { display: flex; flex-wrap: wrap; gap: 8px; }
    .versions button { border: 1px solid var(--line); background: var(--surface); color: var(--fg); border-radius: 6px; padding: 6px 10px; font: 500 13px var(--body); cursor: pointer; }
    .versions button[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
    .fact { display: grid; gap: 4px; padding: 10px 0; border-top: 1px solid var(--line); font-size: 14px; }
    .fact:first-of-type { border-top: 0; padding-top: 0; }
    .fact blockquote { margin: 0; padding: 4px 10px; border-left: 3px solid var(--line); background: var(--surface-2); overflow-wrap: anywhere; }
    ul.plain { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  `,
  template: `
    @if (!cvId()) {
      <p class="muted">{{ i18n.t('doc.needCv') }}</p>
    } @else {
      <div class="stack">
        <section class="card">
          <h2>{{ i18n.t('doc.options') }}</h2>
          <form class="stack-sm" [formGroup]="form" (ngSubmit)="generate()">
            <div class="cols">
              <label for="o-lang">{{ i18n.t('doc.language') }}
                <select id="o-lang" formControlName="language">
                  <option value="">{{ i18n.t('doc.language.auto') }}</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </label>
              @if (kind() === 'LETTER') {
                <label for="o-tone">{{ i18n.t('doc.tone') }}
                  <select id="o-tone" formControlName="tone">
                    @for (t of tones; track t) { <option [value]="t">{{ i18n.t(toneKey(t)) }}</option> }
                  </select>
                </label>
                <label for="o-len">{{ i18n.t('doc.length') }}
                  <select id="o-len" formControlName="length">
                    @for (l of lengths; track l) { <option [value]="l">{{ i18n.t(lengthKey(l)) }}</option> }
                  </select>
                </label>
              }
              <label for="o-form">{{ i18n.t('doc.formality') }}
                <select id="o-form" formControlName="formality">
                  <option value="FORMAL">{{ i18n.t('formality.FORMAL') }}</option>
                  <option value="STANDARD">{{ i18n.t('formality.STANDARD') }}</option>
                </select>
              </label>
            </div>
            @if (kind() === 'LETTER') {
              <label class="check" for="o-ai"><input id="o-ai" type="checkbox" formControlName="useAi" /> {{ i18n.t('doc.useAi') }}</label>
            } @else {
              <label class="check" for="o-inc"><input id="o-inc" type="checkbox" formControlName="includeLetter" /> {{ i18n.t('email.include') }}</label>
            }
            <div class="actions">
              <button class="btn primary" type="submit" [disabled]="busy()">
                @if (busy()) { <span class="spinner"></span> {{ i18n.t('doc.generating') }} } @else { {{ doc() ? i18n.t('doc.regenerate') : i18n.t('doc.generate') }} }
              </button>
            </div>
          </form>
        </section>

        @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
        @if (notice()) { <p class="banner ok" role="status">{{ notice() }}</p> }

        @if (doc(); as d) {
          @if (versions().length > 1) {
            <div class="versions" role="group" [attr.aria-label]="i18n.t('doc.versions')">
              @for (v of versions(); track v.id) {
                <button type="button" [attr.aria-pressed]="v.id === d.id" (click)="open(v.id)">
                  {{ i18n.t('doc.version', { n: v.version }) }} · {{ i18n.t(sourceKey(v.source)) }}
                </button>
              }
            </div>
          }

          <p class="banner attn">{{ i18n.t('doc.review') }}</p>
          @if (kind() === 'EMAIL') { <p class="banner">{{ i18n.t('email.never') }}</p> }
          @if (noteKey(); as nk) { <p class="hint">{{ i18n.t(nk) }}</p> }
          @if (d.jobLanguage && d.jobLanguage !== d.language) {
            <p class="hint">{{ i18n.t('doc.langMismatch', { offer: langName(d.jobLanguage), draft: langName(d.language) }) }}</p>
          }

          @if (d.warnings.length) {
            <div class="banner error" role="alert">
              <p>{{ i18n.t('doc.warnings') }}</p>
              <p><strong>{{ d.warnings.join(', ') }}</strong></p>
            </div>
          }

          <div class="editor">
            <section class="card">
              <p class="hint">
                {{ i18n.t('doc.version', { n: d.version }) }} · {{ i18n.t(sourceKey(d.source)) }} ·
                {{ d.generator === 'template' ? i18n.t('doc.generator.template') : i18n.t('doc.generator.ai') }} · {{ d.createdAt | date: 'short' }}
              </p>
              @if (kind() === 'EMAIL') {
                <label for="d-subject">{{ i18n.t('email.subject') }}
                  <input id="d-subject" type="text" [value]="subject()" (input)="subject.set($any($event.target).value)" maxlength="300" />
                </label>
                @if (recipient()) { <p class="hint">{{ i18n.t('email.to') }}: <span class="mono">{{ recipient() }}</span></p> }
                @else { <p class="hint">{{ i18n.t('email.noRecipient') }}</p> }
              }
              <label for="d-body">{{ kind() === 'EMAIL' ? i18n.t('email.body') : i18n.t('doc.edit') }}
                <textarea id="d-body" class="doc" [value]="text()" (input)="text.set($any($event.target).value)"></textarea>
              </label>
              <div class="actions">
                <button class="btn primary" type="button" (click)="save()" [disabled]="!dirty() || busy()">{{ i18n.t('doc.save') }}</button>
                @if (kind() === 'LETTER') {
                  <button class="btn" type="button" (click)="download('pdf')">PDF</button>
                  <button class="btn" type="button" (click)="download('docx')">DOCX</button>
                  <button class="btn" type="button" (click)="download('txt')">TXT</button>
                } @else {
                  <button class="btn" type="button" (click)="copy(subject(), 'subject')">{{ i18n.t('email.copySubject') }}</button>
                  <button class="btn" type="button" (click)="copy(text(), 'body')">{{ i18n.t('email.copyBody') }}</button>
                  <button class="btn" type="button" (click)="download('eml')">{{ i18n.t('email.eml') }}</button>
                  <button class="btn" type="button" (click)="download('txt')">{{ i18n.t('email.txt') }}</button>
                  @if (mailto(); as href) { <a class="btn" [href]="href">{{ i18n.t('email.mailto') }}</a> }
                }
                <button class="btn ghost" type="button" (click)="remove()" [disabled]="busy()">{{ i18n.t('doc.delete') }}</button>
              </div>
              @if (dirty()) { <p class="hint">{{ i18n.t('review.unsaved') }}</p> }
            </section>

            <aside class="card">
              <h2>{{ i18n.t('doc.evidence') }}</h2>
              <p class="hint">{{ i18n.t('doc.evidence.hint') }}</p>
              @for (f of d.facts; track f.id) {
                <div class="fact">
                  <span class="eyebrow">{{ f.id }} · {{ i18n.t(factKey(f.type)) }}</span>
                  @if (f.title) { <strong>{{ f.title }}@if (f.company) { · {{ f.company }} }</strong> }
                  <blockquote>{{ f.text }}</blockquote>
                </div>
              }
            </aside>
          </div>
        } @else if (!loading()) {
          <p class="muted">{{ i18n.t('doc.empty') }}</p>
        }
      </div>
    }
  `,
})
export class DocWorkspace {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly kind = input.required<'LETTER' | 'EMAIL'>();
  readonly jobId = input.required<string>();
  readonly cvId = input<string | null>(null);
  /** A published email address the user chose on the contact tab. */
  readonly recipient = input<string | null>(null);
  readonly contactName = input<string | null>(null);

  protected readonly tones: Tone[] = ['NEUTRAL', 'WARM', 'DIRECT'];
  protected readonly lengths: Length[] = ['SHORT', 'STANDARD', 'DETAILED'];

  protected readonly doc = signal<DocView | null>(null);
  protected readonly versions = signal<DocSummary[]>([]);
  protected readonly text = signal('');
  protected readonly subject = signal('');
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly form = this.fb.group({
    language: [''],
    tone: ['NEUTRAL' as Tone],
    length: ['STANDARD' as Length],
    formality: ['FORMAL' as Formality],
    useAi: [true],
    includeLetter: [true],
  });

  protected readonly dirty = computed(() => {
    const d = this.doc();
    return d !== null && (this.text() !== d.body || (this.kind() === 'EMAIL' && this.subject() !== (d.subject ?? '')));
  });

  protected readonly noteKey = computed<Key | null>(() => {
    const n = this.doc()?.note;
    return n ? (`doc.note.${n}` as Key) : null;
  });

  /** mailto: links are a convenience; very long drafts exceed what mail programs accept, so no link is offered then. */
  protected readonly mailto = computed(() => {
    const to = this.recipient();
    if (!to || this.kind() !== 'EMAIL') {
      return null;
    }
    const href = `mailto:${to}?subject=${encodeURIComponent(this.subject())}&body=${encodeURIComponent(this.text())}`;
    return href.length <= 1900 ? href : `mailto:${to}?subject=${encodeURIComponent(this.subject())}`;
  });

  constructor() {
    effect(() => {
      const job = this.jobId();
      const kind = this.kind();
      this.loading.set(true);
      this.api.documentVersions(job, kind).subscribe({
        next: (v) => {
          this.versions.set(v);
          if (v.length > 0) {
            this.open(v[0].id);
          } else {
            this.loading.set(false);
          }
        },
        error: (e) => {
          this.error.set(problemMessage(e));
          this.loading.set(false);
        },
      });
    });
  }

  protected toneKey(t: Tone): Key {
    return `tone.${t}` as Key;
  }
  protected lengthKey(l: Length): Key {
    return `length.${l}` as Key;
  }
  protected langName(code: string): string {
    return new Intl.DisplayNames([this.i18n.lang()], { type: 'language' }).of(code) ?? code;
  }
  protected sourceKey(s: string): Key {
    return `doc.source.${s}` as Key;
  }
  protected factKey(t: string): Key {
    return `fact.${t}` as Key;
  }

  protected open(id: string) {
    this.api.getDocument(id).subscribe({
      next: (d) => {
        this.show(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }

  private show(d: DocView) {
    this.doc.set(d);
    this.text.set(d.body);
    this.subject.set(d.subject ?? '');
  }

  private refreshVersions() {
    this.api.documentVersions(this.jobId(), this.kind()).subscribe((v) => this.versions.set(v));
  }

  protected generate() {
    const cv = this.cvId();
    if (!cv) {
      return;
    }
    const f = this.form.getRawValue();
    const language = f.language || null;
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    const request =
      this.kind() === 'LETTER'
        ? this.api.createLetter(this.jobId(), { cvId: cv, language, tone: f.tone, length: f.length, formality: f.formality, useAi: f.useAi })
        : this.api.createEmail(this.jobId(), { cvId: cv, language, formality: f.formality, includeLetter: f.includeLetter, contactName: this.contactName() });
    request.subscribe({
      next: (d) => {
        this.show(d);
        this.refreshVersions();
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected save() {
    const d = this.doc();
    if (!d) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.editDocument(d.id, this.text(), this.kind() === 'EMAIL' ? this.subject() : null).subscribe({
      next: (saved) => {
        this.show(saved);
        this.refreshVersions();
        this.notice.set(this.i18n.t('doc.saved', { n: saved.version }));
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected remove() {
    const d = this.doc();
    if (!d) {
      return;
    }
    this.busy.set(true);
    this.api.deleteDocument(d.id).subscribe({
      next: () => {
        this.doc.set(null);
        this.busy.set(false);
        this.api.documentVersions(this.jobId(), this.kind()).subscribe((v) => {
          this.versions.set(v);
          if (v.length > 0) {
            this.open(v[0].id);
          }
        });
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected download(format: string) {
    const d = this.doc();
    if (!d) {
      return;
    }
    // Unsaved edits would be missing from the file, so ask the user to save first.
    if (this.dirty()) {
      this.error.set(this.i18n.t('review.unsaved') + ': ' + this.i18n.t('doc.save'));
      return;
    }
    const name = (this.kind() === 'LETTER' ? 'motivation-letter' : 'application-email') + `-v${d.version}.${format}`;
    this.api.exportDocument(d.id, format, format === 'eml' ? this.recipient() : null).subscribe({
      next: (blob) => downloadBlob(blob, name),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected async copy(value: string, what: 'subject' | 'body') {
    try {
      await navigator.clipboard.writeText(value);
      this.notice.set(`${this.i18n.t('email.copied')}: ${what === 'subject' ? this.i18n.t('email.subject') : this.i18n.t('email.body')}`);
      this.error.set(null);
    } catch {
      this.error.set(this.i18n.t('email.copyFailed'));
    }
  }
}
