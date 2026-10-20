import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api, problemMessage } from '../core/api';
import { Auth } from '../core/auth';
import { I18n } from '../core/i18n';
import { downloadText } from '../shared/download';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  template: `
    <div class="stack">
      <h1>{{ i18n.t('set.title') }}</h1>

      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

      <section class="card">
        <h2>{{ i18n.t('set.account') }}</h2>
        <p><strong>{{ auth.user()?.displayName }}</strong> · <span class="mono">{{ auth.user()?.email }}</span></p>
        <div class="row" role="group" [attr.aria-label]="i18n.t('set.language')">
          <span class="muted">{{ i18n.t('set.language') }}</span>
          <button class="btn small" type="button" [class.primary]="i18n.lang() === 'en'" (click)="i18n.use('en')">English</button>
          <button class="btn small" type="button" [class.primary]="i18n.lang() === 'fr'" (click)="i18n.use('fr')">Français</button>
        </div>
      </section>

      <section class="card">
        <h2>{{ i18n.t('set.storage') }}</h2>
        <p class="muted">{{ i18n.t('set.storage.d') }}</p>
      </section>

      <section class="card">
        <h2>{{ i18n.t('set.data') }}</h2>
        <p class="muted">{{ i18n.t('set.data.d') }}</p>
        <div><button class="btn" type="button" (click)="exportData()" [disabled]="busy()">{{ i18n.t('set.export') }}</button></div>
      </section>

      <section class="card">
        <h2>{{ i18n.t('set.delete') }}</h2>
        <p class="muted">{{ i18n.t('set.delete.d') }}</p>
        <form class="stack-sm" [formGroup]="del" (ngSubmit)="remove()">
          <label for="pw">{{ i18n.t('set.delete.pw') }}
            <input id="pw" type="password" formControlName="password" autocomplete="current-password" />
          </label>
          <div><button class="btn danger" type="submit" [disabled]="del.invalid || busy()">{{ i18n.t('set.delete.go') }}</button></div>
        </form>
      </section>
    </div>
  `,
})
export class Settings {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly del = inject(FormBuilder).nonNullable.group({ password: ['', Validators.required] });

  protected exportData() {
    this.busy.set(true);
    this.error.set(null);
    this.api.exportAccount().subscribe({
      next: (data) => {
        downloadText(JSON.stringify(data, null, 2), 'jobmatcher-data.json', 'application/json');
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected remove() {
    this.busy.set(true);
    this.error.set(null);
    this.api.deleteAccount(this.del.getRawValue().password).subscribe({
      next: () => this.auth.clear(),
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }
}
