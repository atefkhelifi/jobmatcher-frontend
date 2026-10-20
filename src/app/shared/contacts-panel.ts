import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { Api, ContactView, ContactsView, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { safeUrl } from './format';

/** Shows recruiting contacts that were published, with where and when they were found. Nothing is ever guessed. */
@Component({
  selector: 'app-contacts-panel',
  imports: [DatePipe],
  styles: `
    .contact { display: grid; gap: 4px; padding: 12px 0; border-top: 1px solid var(--line); }
    .contact:first-of-type { border-top: 0; padding-top: 0; }
    .head { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: baseline; }
    .value { font: 500 15px var(--mono); overflow-wrap: anywhere; }
    .meta { font-size: 13px; color: var(--muted); overflow-wrap: anywhere; }
    .none { font-size: 17px; font-weight: 600; }
  `,
  template: `
    <section class="card">
      <h2>{{ i18n.t('tab.contact') }}</h2>
      <p class="muted">{{ i18n.t('contact.intro') }}</p>
      <div class="row">
        <button class="btn primary" type="button" (click)="discover()" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> {{ i18n.t('contact.discovering') }} } @else { {{ i18n.t('contact.discover') }} }
        </button>
        @if (view(); as v) {
          @if (v.searched) {
            <span class="hint">{{ i18n.t('contact.pages', { n: v.pagesRead }) }} · {{ v.searchedAt | date: 'short' }}</span>
          }
        }
      </div>
      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      @if (view(); as v) {
        @if (!v.searched) {
          <p class="muted">{{ i18n.t('contact.notSearched') }}</p>
        }
        @if (v.note === 'board') { <p class="banner">{{ i18n.t('contact.board') }}</p> }

        @for (c of v.contacts; track c.id) {
          <article class="contact">
            <div class="head">
              <span class="chip neutral">{{ i18n.t(kindKey(c.kind)) }}</span>
              <span class="value">{{ c.value }}</span>
              <span class="chip" [class.low]="c.verified" [class.med]="!c.verified" [title]="c.verified ? i18n.t('contact.verified.hint') : i18n.t('contact.unverified.hint')">
                {{ c.verified ? i18n.t('contact.verified') : i18n.t('contact.unverified') }}
              </span>
            </div>
            @if (c.title) { <div class="meta">{{ c.title }}</div> }
            <div class="meta">
              {{ i18n.t('contact.source') }}:
              @if (link(c.sourceUrl); as href) { <a [href]="href" target="_blank" rel="noopener noreferrer">{{ c.sourceUrl }}</a> } @else { {{ c.sourceUrl }} }
              · {{ i18n.t('contact.found', { date: (c.discoveredAt | date: 'mediumDate') ?? '' }) }}
            </div>
            @if (c.kind === 'URL' && link(c.value); as href) {
              <div><a class="btn small" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('contact.apply') }} ↗</a></div>
            }
            @if (c.kind === 'EMAIL') {
              <div class="row">
                <button class="btn small" type="button" (click)="choose(c)" [class.primary]="chosen()?.id === c.id">
                  {{ chosen()?.id === c.id ? i18n.t('contact.recipient.on') : i18n.t('contact.recipient') }}
                </button>
              </div>
            }
          </article>
        }

        @if (v.searched && !v.hasEmail) {
          <p class="none">{{ i18n.t('contact.none') }}</p>
        }
        @if (link(v.applyUrl); as href) {
          <div><a class="btn" [href]="href" target="_blank" rel="noopener noreferrer">{{ i18n.t('contact.apply') }} ↗</a></div>
        }
      }
    </section>
  `,
})
export class ContactsPanel {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);

  readonly jobId = input.required<string>();
  /** The email contact the user picked as the recipient of the application email. */
  readonly chosen = input<ContactView | null>(null);
  readonly chooseContact = output<ContactView | null>();

  protected readonly view = signal<ContactsView | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.api.getContacts(this.jobId()).subscribe({
        next: (v) => this.view.set(v),
        error: (e) => this.error.set(problemMessage(e)),
      });
    });
  }

  protected kindKey(k: string): Key {
    return `contact.kind.${k}` as Key;
  }

  protected link(u: string | null | undefined): string | null {
    return safeUrl(u);
  }

  protected discover() {
    this.busy.set(true);
    this.error.set(null);
    this.api.discoverContacts(this.jobId()).subscribe({
      next: (v) => {
        this.view.set(v);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected choose(c: ContactView) {
    this.chooseContact.emit(this.chosen()?.id === c.id ? null : c);
  }
}
