import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, problemMessage } from '../core/api';
import { Auth } from '../core/auth';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  styles: `:host { display: block; max-width: 420px; margin: 24px auto 0; }`,
  template: `
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h1 style="font-size: 28px">{{ i18n.t('auth.login.title') }}</h1>
      @if (error()) {
        <p class="banner error" role="alert">{{ error() }}</p>
      }
      <label for="email">{{ i18n.t('auth.email') }}
        <input id="email" type="email" formControlName="email" autocomplete="email" />
      </label>
      <label for="password">{{ i18n.t('auth.password') }}
        <input id="password" type="password" formControlName="password" autocomplete="current-password" />
      </label>
      <button class="btn primary" type="submit" [disabled]="form.invalid || busy()">{{ i18n.t('auth.login.submit') }}</button>
      <p class="hint">{{ i18n.t('auth.login.new') }} <a routerLink="/register">{{ i18n.t('nav.signup') }}</a></p>
    </form>
  `,
})
export class Login {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit() {
    if (this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.login(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.auth.set(u);
        this.router.navigateByUrl('/app');
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }
}
