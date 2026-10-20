import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, AppDetail, AppStatus, DocSummary, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { downloadBlob } from '../shared/download';
import { safeUrl } from '../shared/format';

const INTERVIEW_KINDS = ['PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR', 'OTHER'] as const;

/** `datetime-local` gives "2026-11-03T14:30" in the browser's zone; the API wants an instant. */
const toInstant = (local: string): string => new Date(local).toISOString();
const toLocalInput = (iso: string | null): string => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

@Component({
  selector: 'app-application-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  styles: `
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
    .two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; align-items: start; }
    .two > * { min-width: 0; }
    ol.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
    ol.timeline li { display: grid; grid-template-columns: 10px 1fr; gap: 12px; padding: 0 0 14px; position: relative; }
    ol.timeline li::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); margin-top: 6px; }
    ol.timeline li::after { content: ''; position: absolute; left: 4px; top: 16px; bottom: 0; width: 2px; background: var(--line); }
    ol.timeline li:last-child::after { display: none; }
    .ev-note { color: var(--muted); font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .item { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--line); }
    .item:first-of-type { border-top: 0; padding-top: 0; }
    .item > div { min-width: 0; overflow-wrap: anywhere; }
    .done { text-decoration: line-through; color: var(--muted); }
    .steps { display: flex; flex-wrap: wrap; gap: 8px; }
  `,
  template: `
    @if (error() && !d()) {
      <p class="banner error" role="alert">{{ error() }}</p>
    } @else if (d(); as a) {
      <div class="stack">
        <div class="stack-sm">
          <a routerLink="/app/applications" class="muted">← {{ i18n.t('app.back') }}</a>
          <h1>{{ a.summary.title }}</h1>
          <div class="row">
            <span class="chip accent">{{ i18n.t(statusKey(a.summary.status)) }}</span>
            @if (a.summary.company) { <strong>{{ a.summary.company }}</strong> }
            @if (a.summary.location) { <span class="muted">{{ a.summary.location }}</span> }
            @if (a.summary.jobId) { <a class="btn small" [routerLink]="['/app/jobs', a.summary.jobId]">{{ i18n.t('app.openOffer') }}</a> }
            @else if (link(a.summary.jobUrl); as href) { <a class="btn small" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('app.openOffer') }} ↗</a> }
          </div>
        </div>

        @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
        @if (notice()) { <p class="banner ok" role="status">{{ notice() }}</p> }

        <section class="card">
          <h2>{{ i18n.t('app.stage') }}</h2>
          @if (a.allowedNext.length === 0) {
            <p class="muted">{{ i18n.t('app.finalStage') }}</p>
          } @else {
            <form class="stack-sm" [formGroup]="statusForm">
              <div class="steps">
                @for (n of a.allowedNext; track n) {
                  <button class="btn" type="button" [class.primary]="n === 'APPLIED' || n === 'OFFER'" (click)="move(n)" [disabled]="busy()">{{ i18n.t(statusKey(n)) }}</button>
                }
              </div>
              <div class="cols">
                <label for="st-note">{{ i18n.t('app.statusNote') }}<input id="st-note" type="text" formControlName="note" maxlength="2000" /></label>
                @if (a.allowedNext.includes('APPLIED')) {
                  <label for="st-fu">{{ i18n.t('app.followUp') }}<input id="st-fu" type="number" min="1" max="90" formControlName="followUp" /></label>
                }
              </div>
            </form>
          }
        </section>

        <div class="two">
          <section class="card">
            <h2>{{ i18n.t('app.details') }}</h2>
            <form class="stack-sm" [formGroup]="detailsForm" (ngSubmit)="saveDetails()">
              <label for="d-title">{{ i18n.t('app.add.title') }}<input id="d-title" type="text" formControlName="title" maxlength="300" /></label>
              <div class="cols">
                <label for="d-co">{{ i18n.t('app.add.company') }}<input id="d-co" type="text" formControlName="company" maxlength="300" /></label>
                <label for="d-loc">{{ i18n.t('app.add.location') }}<input id="d-loc" type="text" formControlName="location" maxlength="300" /></label>
              </div>
              <label for="d-url">{{ i18n.t('app.add.url') }}<input id="d-url" type="text" inputmode="url" formControlName="jobUrl" maxlength="2000" /></label>
              <div class="cols">
                <label for="d-ap">{{ i18n.t('app.appliedAt') }}<input id="d-ap" type="date" formControlName="appliedAt" /></label>
                <label for="d-dl">{{ i18n.t('app.deadlineAt') }}<input id="d-dl" type="date" formControlName="deadlineAt" /></label>
              </div>
              <label for="d-notes">{{ i18n.t('app.notes') }}<textarea id="d-notes" rows="5" formControlName="notes" maxlength="10000"></textarea></label>
              <div class="row">
                <button class="btn primary" type="submit" [disabled]="detailsForm.invalid || busy()">{{ i18n.t('app.save') }}</button>
                <button class="btn" type="button" (click)="calendar()">{{ i18n.t('app.calendar') }}</button>
              </div>
            </form>
          </section>

          <section class="card">
            <h2>{{ i18n.t('app.timeline') }}</h2>
            <ol class="timeline">
              @for (e of a.timeline; track e.id) {
                <li>
                  <div>
                    <strong>{{ eventLabel(e) }}</strong>
                    <span class="hint"> · {{ e.occurredAt | date: 'medium' }}</span>
                    @if (e.note) { <div class="ev-note">{{ e.note }}</div> }
                  </div>
                </li>
              }
            </ol>
            <form class="row" [formGroup]="noteForm" (ngSubmit)="addNote()">
              <input type="text" formControlName="text" [attr.aria-label]="i18n.t('app.noteAdd')" [placeholder]="i18n.t('app.noteAdd')" maxlength="5000" style="flex: 1; min-width: 160px" />
              <button class="btn" type="submit" [disabled]="noteForm.invalid || busy()">{{ i18n.t('app.noteAdd') }}</button>
            </form>
          </section>
        </div>

        <div class="two">
          <section class="card">
            <h2>{{ i18n.t('app.interviews') }}</h2>
            @for (i of a.interviews; track i.id) {
              <div class="item">
                <div>
                  <strong>{{ i18n.t(kindKey(i.kind)) }}</strong> · {{ i.scheduledAt | date: 'EEE d MMM, HH:mm' }} · {{ i.durationMinutes }} min
                  @if (i.location) { <div class="hint">{{ i.location }}</div> }
                  @if (i.notes) { <div class="ev-note">{{ i.notes }}</div> }
                </div>
                <button class="btn small ghost" type="button" (click)="remove('interviews', i.id)">{{ i18n.t('app.remove') }}</button>
              </div>
            } @empty { <p class="muted">{{ i18n.t('app.none') }}</p> }
            <form class="stack-sm" [formGroup]="interviewForm" (ngSubmit)="addInterview()">
              <div class="cols">
                <label for="i-kind">{{ i18n.t('app.interview.kind') }}
                  <select id="i-kind" formControlName="kind">@for (k of kinds; track k) { <option [value]="k">{{ i18n.t(kindKey(k)) }}</option> }</select>
                </label>
                <label for="i-when">{{ i18n.t('app.interview.when') }}<input id="i-when" type="datetime-local" formControlName="when" /></label>
                <label for="i-dur">{{ i18n.t('app.interview.duration') }}<input id="i-dur" type="number" min="5" max="600" formControlName="minutes" /></label>
              </div>
              <label for="i-loc">{{ i18n.t('app.interview.location') }}<input id="i-loc" type="text" formControlName="location" maxlength="500" /></label>
              <label for="i-notes">{{ i18n.t('app.interview.notes') }}<input id="i-notes" type="text" formControlName="notes" maxlength="2000" /></label>
              <div><button class="btn" type="submit" [disabled]="interviewForm.invalid || busy()">{{ i18n.t('app.interview.add') }}</button></div>
            </form>
          </section>

          <section class="card">
            <h2>{{ i18n.t('app.reminders') }}</h2>
            @for (r of a.reminders; track r.id) {
              <div class="item">
                <div [class.done]="r.doneAt">
                  {{ r.text }}
                  <div class="hint">{{ r.dueAt | date: 'medium' }}@if (r.overdue) { · <span class="chip high">{{ i18n.t('app.overdue', { n: 1 }) }}</span> }</div>
                </div>
                <div class="row">
                  <button class="btn small" type="button" (click)="done(r.id, !r.doneAt)">{{ r.doneAt ? i18n.t('app.reminder.reopen') : i18n.t('app.reminder.done') }}</button>
                  <button class="btn small ghost" type="button" (click)="remove('reminders', r.id)">{{ i18n.t('app.remove') }}</button>
                </div>
              </div>
            } @empty { <p class="muted">{{ i18n.t('app.none') }}</p> }
            <form class="stack-sm" [formGroup]="reminderForm" (ngSubmit)="addReminder()">
              <label for="r-text">{{ i18n.t('app.reminder.text') }}<input id="r-text" type="text" formControlName="text" maxlength="500" /></label>
              <label for="r-due">{{ i18n.t('app.reminder.due') }}<input id="r-due" type="datetime-local" formControlName="due" /></label>
              <div><button class="btn" type="submit" [disabled]="reminderForm.invalid || busy()">{{ i18n.t('app.reminder.add') }}</button></div>
            </form>
          </section>
        </div>

        <div class="two">
          <section class="card">
            <h2>{{ i18n.t('app.contacts') }}</h2>
            @for (c of a.contacts; track c.id) {
              <div class="item">
                <div>
                  <strong>{{ c.name }}</strong>@if (c.role) { · {{ c.role }} }
                  @if (c.email) { <div class="hint mono">{{ c.email }}</div> }
                  @if (c.phone) { <div class="hint">{{ c.phone }}</div> }
                  @if (c.note) { <div class="ev-note">{{ c.note }}</div> }
                </div>
                <button class="btn small ghost" type="button" (click)="remove('contacts', c.id)">{{ i18n.t('app.remove') }}</button>
              </div>
            } @empty { <p class="muted">{{ i18n.t('app.none') }}</p> }
            <form class="stack-sm" [formGroup]="contactForm" (ngSubmit)="addContact()">
              <div class="cols">
                <label for="c-name">{{ i18n.t('app.contact.name') }}<input id="c-name" type="text" formControlName="name" maxlength="200" /></label>
                <label for="c-role">{{ i18n.t('app.contact.role') }}<input id="c-role" type="text" formControlName="role" maxlength="200" /></label>
                <label for="c-mail">{{ i18n.t('app.contact.email') }}<input id="c-mail" type="email" formControlName="email" maxlength="254" /></label>
                <label for="c-tel">{{ i18n.t('app.contact.phone') }}<input id="c-tel" type="text" formControlName="phone" maxlength="60" /></label>
              </div>
              <div><button class="btn" type="submit" [disabled]="contactForm.invalid || busy()">{{ i18n.t('app.contact.add') }}</button></div>
            </form>
          </section>

          <section class="card">
            <h2>{{ i18n.t('app.attachments') }}</h2>
            @for (t of a.attachments; track t.id) {
              <div class="item">
                <div>
                  @if (t.kind === 'DOCUMENT' && a.summary.jobId) { <a [routerLink]="['/app/jobs', a.summary.jobId]">{{ t.label }}</a> }
                  @else if (link(t.url); as href) { <a [href]="href" target="_blank" rel="noopener noreferrer">{{ t.label }} ↗</a> }
                  @else { {{ t.label }} }
                </div>
                <button class="btn small ghost" type="button" (click)="remove('attachments', t.id)">{{ i18n.t('app.remove') }}</button>
              </div>
            } @empty { <p class="muted">{{ i18n.t('app.none') }}</p> }
            @if (docs().length > 0) {
              <form class="row" [formGroup]="docForm" (ngSubmit)="attachDoc()">
                <select formControlName="documentId" [attr.aria-label]="i18n.t('app.attach.doc')" style="flex: 1; min-width: 160px">
                  <option value="">{{ i18n.t('app.attach.pick') }}</option>
                  @for (x of docs(); track x.id) { <option [value]="x.id">{{ x.label }}</option> }
                </select>
                <button class="btn" type="submit" [disabled]="!docForm.controls.documentId.value || busy()">{{ i18n.t('app.attach.add') }}</button>
              </form>
            }
            <form class="stack-sm" [formGroup]="linkForm" (ngSubmit)="attachLink()">
              <div class="cols">
                <label for="l-label">{{ i18n.t('app.attach.label') }}<input id="l-label" type="text" formControlName="label" maxlength="200" /></label>
                <label for="l-url">{{ i18n.t('app.attach.url') }}<input id="l-url" type="text" inputmode="url" formControlName="url" placeholder="https://" maxlength="2000" /></label>
              </div>
              <div><button class="btn" type="submit" [disabled]="linkForm.invalid || busy()">{{ i18n.t('app.attach.link') }}</button></div>
            </form>
          </section>
        </div>

        <section class="card">
          @if (confirmDelete()) {
            <p>{{ i18n.t('app.delete.confirm') }}</p>
            <div class="row">
              <button class="btn danger" type="button" (click)="deleteIt()">{{ i18n.t('app.delete.yes') }}</button>
              <button class="btn" type="button" (click)="confirmDelete.set(false)">{{ i18n.t('cv.cancel') }}</button>
            </div>
          } @else {
            <div><button class="btn danger" type="button" (click)="confirmDelete.set(true)">{{ i18n.t('app.delete') }}</button></div>
          }
        </section>
      </div>
    } @else {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    }
  `,
})
export class ApplicationDetailPage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly id = input.required<string>();

  protected readonly kinds = INTERVIEW_KINDS;
  protected readonly d = signal<AppDetail | null>(null);
  protected readonly docs = signal<{ id: string; label: string }[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly confirmDelete = signal(false);

  protected readonly statusForm = this.fb.group({ note: [''], followUp: [7 as number | null] });
  protected readonly detailsForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    company: [''],
    location: [''],
    jobUrl: ['', Validators.pattern(/^(https?:\/\/\S+)?$/i)],
    appliedAt: [''],
    deadlineAt: [''],
    notes: [''],
  });
  protected readonly noteForm = this.fb.group({ text: ['', Validators.required] });
  protected readonly interviewForm = this.fb.group({
    kind: ['VIDEO'],
    when: ['', Validators.required],
    minutes: [60],
    location: [''],
    notes: [''],
  });
  protected readonly reminderForm = this.fb.group({ text: ['', Validators.required], due: ['', Validators.required] });
  protected readonly contactForm = this.fb.group({
    name: ['', Validators.required],
    role: [''],
    email: ['', Validators.email],
    phone: [''],
  });
  protected readonly docForm = this.fb.group({ documentId: [''] });
  protected readonly linkForm = this.fb.group({
    label: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/i)]],
  });

  constructor() {
    effect(() => {
      this.api.application(this.id()).subscribe({
        next: (x) => this.show(x, true),
        error: (e) => this.error.set(problemMessage(e)),
      });
    });
  }

  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }
  protected kindKey(k: string): Key {
    return `ik.${k}` as Key;
  }
  protected link(u: string | null | undefined): string | null {
    return safeUrl(u);
  }

  protected eventLabel(e: AppDetail['timeline'][number]): string {
    if (e.type === 'STATUS' && e.from && e.to) {
      return `${this.i18n.t(this.statusKey(e.from))} → ${this.i18n.t(this.statusKey(e.to))}`;
    }
    return this.i18n.t(`ev.${e.type}` as Key);
  }

  private show(x: AppDetail, loadDocs = false) {
    this.d.set(x);
    const s = x.summary;
    this.detailsForm.reset({
      title: s.title,
      company: s.company ?? '',
      location: s.location ?? '',
      jobUrl: s.jobUrl ?? '',
      appliedAt: toDateInput(s.appliedAt),
      deadlineAt: toDateInput(s.deadlineAt),
      notes: x.notes ?? '',
    });
    if (loadDocs && s.jobId) {
      const jobId = s.jobId;
      const collected: { id: string; label: string }[] = [];
      for (const type of ['LETTER', 'EMAIL'] as const) {
        this.api.documentVersions(jobId, type).subscribe((v: DocSummary[]) => {
          v.forEach((x2) => collected.push({ id: x2.id, label: `${this.i18n.t(type === 'LETTER' ? 'tab.letter' : 'tab.email')} v${x2.version}` }));
          this.docs.set([...collected]);
        });
      }
    }
  }

  private run(request: ReturnType<Api['application']>, message?: string) {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: (x) => {
        this.show(x);
        this.busy.set(false);
        if (message) {
          this.notice.set(message);
        }
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected move(status: AppStatus) {
    const v = this.statusForm.getRawValue();
    this.run(this.api.moveApplication(this.id(), status, v.note.trim() || null, status === 'APPLIED' ? v.followUp : null));
    this.statusForm.patchValue({ note: '' });
  }

  protected saveDetails() {
    if (this.detailsForm.invalid) {
      return;
    }
    const v = this.detailsForm.getRawValue();
    this.run(
      this.api.updateApplication(this.id(), {
        title: v.title.trim(),
        company: v.company.trim() || null,
        location: v.location.trim() || null,
        jobUrl: v.jobUrl.trim() || null,
        notes: v.notes.trim() || null,
        appliedAt: v.appliedAt ? `${v.appliedAt}T00:00:00Z` : null,
        deadlineAt: v.deadlineAt ? `${v.deadlineAt}T00:00:00Z` : null,
        cvId: this.d()?.cvId ?? null,
      }),
      this.i18n.t('app.saved'),
    );
  }

  protected addNote() {
    if (this.noteForm.invalid) {
      return;
    }
    this.run(this.api.addAppItem(this.id(), 'notes', { text: this.noteForm.getRawValue().text.trim() }));
    this.noteForm.reset({ text: '' });
  }

  protected addContact() {
    if (this.contactForm.invalid) {
      return;
    }
    const v = this.contactForm.getRawValue();
    this.run(this.api.addAppItem(this.id(), 'contacts', { name: v.name.trim(), role: v.role.trim() || null, email: v.email.trim() || null, phone: v.phone.trim() || null }));
    this.contactForm.reset({ name: '', role: '', email: '', phone: '' });
  }

  protected addInterview() {
    if (this.interviewForm.invalid) {
      return;
    }
    const v = this.interviewForm.getRawValue();
    this.run(
      this.api.addAppItem(this.id(), 'interviews', {
        kind: v.kind,
        scheduledAt: toInstant(v.when),
        durationMinutes: v.minutes,
        location: v.location.trim() || null,
        notes: v.notes.trim() || null,
      }),
    );
    this.interviewForm.reset({ kind: 'VIDEO', when: '', minutes: 60, location: '', notes: '' });
  }

  protected addReminder() {
    if (this.reminderForm.invalid) {
      return;
    }
    const v = this.reminderForm.getRawValue();
    this.run(this.api.addAppItem(this.id(), 'reminders', { dueAt: toInstant(v.due), text: v.text.trim() }));
    this.reminderForm.reset({ text: '', due: '' });
  }

  protected done(reminderId: string, done: boolean) {
    this.run(this.api.completeReminder(this.id(), reminderId, done));
  }

  protected attachDoc() {
    const documentId = this.docForm.getRawValue().documentId;
    if (documentId) {
      this.run(this.api.addAppItem(this.id(), 'attachments', { documentId }));
      this.docForm.reset({ documentId: '' });
    }
  }

  protected attachLink() {
    if (this.linkForm.invalid) {
      return;
    }
    const v = this.linkForm.getRawValue();
    this.run(this.api.addAppItem(this.id(), 'attachments', { label: v.label.trim(), url: v.url.trim() }));
    this.linkForm.reset({ label: '', url: '' });
  }

  protected remove(path: 'contacts' | 'interviews' | 'reminders' | 'attachments', itemId: string) {
    this.run(this.api.removeAppItem(this.id(), path, itemId));
  }

  protected calendar() {
    this.api.calendar(this.id()).subscribe({
      next: (b) => downloadBlob(b, 'jobmatcher-application.ics'),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }

  protected deleteIt() {
    this.api.deleteApplication(this.id()).subscribe({
      next: () => this.router.navigateByUrl('/app/applications'),
      error: (e) => this.error.set(problemMessage(e)),
    });
  }
}
