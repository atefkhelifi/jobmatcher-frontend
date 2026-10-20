import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, problemMessage } from '../core/api';
import { Auth } from '../core/auth';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  styles: `:host { display: block; max-width: 460px; margin: 24px auto 0; }`,
  template: `
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h1 style="font-size: 28px">{{ i18n.t('auth.register.title') }}</h1>
      @if (error()) {
        <p class="banner error" role="alert">{{ error() }}</p>
      }
      <label for="name">{{ i18n.t('auth.name') }}
        <input id="name" type="text" formControlName="displayName" autocomplete="name" />
      </label>
      <label for="email">{{ i18n.t('auth.email') }}
        <input id="email" type="email" formControlName="email" autocomplete="email" />
      </label>
      <label for="password">{{ i18n.t('auth.password') }}
        <input id="password" type="password" formControlName="password" autocomplete="new-password" />
        <span class="hint">{{ i18n.t('auth.passwordHint') }}</span>
      </label>
      <label for="lang">{{ i18n.t('auth.language') }}
        <select id="lang" formControlName="preferredLanguage" (change)="i18n.use(form.controls.preferredLanguage.value)">
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </label>
      <label class="check" for="consent">
        <input id="consent" type="checkbox" formControlName="consent" />
        <span>{{ i18n.t('auth.consent') }}</span>
      </label>
      <button class="btn primary" type="submit" [disabled]="form.invalid || busy()">{{ i18n.t('auth.register.submit') }}</button>
      <p class="hint">{{ i18n.t('auth.register.have') }} <a routerLink="/login">{{ i18n.t('nav.signin') }}</a></p>
    </form>
  `,
})
export class Register {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    preferredLanguage: [this.i18n.lang() as 'en' | 'fr'],
    consent: [false, Validators.requiredTrue],
  });

  protected submit() {
    if (this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.register(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.auth.set(u);
        this.router.navigateByUrl('/app/cvs');
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }
}
