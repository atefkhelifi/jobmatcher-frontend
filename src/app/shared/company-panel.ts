import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, CompanyProfile } from '../core/api';
import { I18n, Key } from '../core/i18n';

/** What the platform has seen of an employer: its own offers and the user's own history. No ratings, reviews or financial claims. */
@Component({
  selector: 'app-company-panel',
  imports: [RouterLink, DatePipe],
  styles: `
    ul { padding-left: 18px; display: grid; gap: 4px; margin: 0; }
  `,
  template: `
    @if (profile(); as c) {
      <section class="card stack-sm">
        <h2>{{ i18n.t('co.title') }}</h2>
        @if (!c.named) {
          <p class="muted">{{ i18n.t('co.unnamed') }}</p>
        } @else {
          <p>{{ i18n.t('co.seen', { name: c.company ?? '', n: c.openOffers }) }}
            @if (c.firstSeenAt) { · {{ i18n.t('co.since', { date: (c.firstSeenAt | date: 'mediumDate') ?? '' }) }} }</p>
          @if (c.offersWithWarnings > 0) {
            <p class="banner attn">{{ i18n.t('co.warned', { n: c.offersWithWarnings }) }}</p>
          }
          @if (c.offers.length > 1) {
            <ul>
              @for (o of c.offers; track o.id) {
                <li><a [routerLink]="['/app/jobs', o.id]">{{ o.title }}</a>@if (o.location) { · {{ o.location }} } · {{ o.sourceKey }}</li>
              }
            </ul>
          }
          @if (c.yourHistory.applications > 0) {
            <p>{{ i18n.t('co.history', { n: c.yourHistory.applications }) }}
              @for (s of statuses(c); track s[0]) { · {{ i18n.t(statusKey(s[0])) }}: {{ s[1] }} }</p>
          }
        }
        <p class="hint">{{ i18n.t('co.honest') }}</p>
      </section>
    }
  `,
})
export class CompanyPanel {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  readonly jobId = input.required<string>();
  protected readonly profile = signal<CompanyProfile | null>(null);

  constructor() {
    effect(() => {
      this.profile.set(null);
      this.api.getCompany(this.jobId()).subscribe({ next: (p) => this.profile.set(p), error: () => undefined });
    });
  }

  protected statuses(c: CompanyProfile): [string, number][] {
    return Object.entries(c.yourHistory.byStatus);
  }
  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }
}
