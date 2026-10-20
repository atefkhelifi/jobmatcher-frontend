import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, AppSummary, DuplicateApp, duplicateDetails, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { SelectedCv } from '../core/selected-cv';

/** Saves an offer to the tracker, warning first when the same role is already tracked, possibly from another source. */
@Component({
  selector: 'app-track-button',
  imports: [RouterLink],
  styles: `
    .dup { display: grid; gap: 8px; }
    ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
  `,
  template: `
    @if (tracked(); as t) {
      <div class="row">
        <span class="chip low">{{ i18n.t('track.tracked', { status: i18n.t(statusKey(t.status)) }) }}</span>
        <a class="btn small" [routerLink]="['/app/applications', t.id]">{{ i18n.t('track.open') }}</a>
      </div>
    } @else {
      <div class="dup">
        @if (duplicates().length > 0) {
          <div class="banner attn" role="alert">
            <strong>{{ i18n.t('track.dup.title') }}</strong>
            <ul>
              @for (d of duplicates(); track d.id) {
                <li>
                  <a [routerLink]="['/app/applications', d.id]">{{ d.title }}@if (d.company) { · {{ d.company }} }</a>
                  · {{ i18n.t(statusKey(d.status)) }} · {{ i18n.t(d.sameOffer ? 'track.dup.same' : 'track.dup.similar') }}
                </li>
              }
            </ul>
          </div>
        }
        <div class="row">
          <button class="btn" type="button" [class.primary]="duplicates().length > 0" (click)="save(duplicates().length > 0)" [disabled]="busy()">
            @if (busy()) { <span class="spinner"></span> {{ i18n.t('track.saving') }} }
            @else if (duplicates().length > 0) { {{ i18n.t('track.dup.confirm') }} }
            @else { {{ i18n.t('track.save') }} }
          </button>
        </div>
        @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
      </div>
    }
  `,
})
export class TrackButton {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly selectedCv = inject(SelectedCv);

  readonly jobId = input.required<string>();

  protected readonly tracked = signal<AppSummary | { id: string; status: AppSummary['status'] } | null>(null);
  protected readonly duplicates = signal<DuplicateApp[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.tracked.set(null);
      this.duplicates.set([]);
      this.api.appCheck(this.jobId()).subscribe({
        next: (found) => {
          const same = found.find((d) => d.sameOffer);
          if (same) {
            this.tracked.set({ id: same.id, status: same.status });
          } else {
            this.duplicates.set(found); // the same role posted elsewhere: shown as a warning before saving
          }
        },
        error: () => undefined,
      });
    });
  }

  protected statusKey(s: string): Key {
    return `st.${s}` as Key;
  }

  protected save(confirm: boolean) {
    this.busy.set(true);
    this.error.set(null);
    this.api.createApplication({ jobId: this.jobId(), cvId: this.selectedCv.id(), confirmDuplicate: confirm }).subscribe({
      next: (d) => {
        this.tracked.set({ id: d.summary.id, status: d.summary.status });
        this.duplicates.set([]);
        this.busy.set(false);
      },
      error: (e) => {
        const dups = duplicateDetails(e);
        if (dups) {
          this.duplicates.set(dups);
        } else {
          this.error.set(problemMessage(e));
        }
        this.busy.set(false);
      },
    });
  }
}
