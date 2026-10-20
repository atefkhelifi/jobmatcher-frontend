import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { Api, User } from './api';
import { I18n } from './i18n';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);

  private readonly _user = signal<User | null>(null);
  private readonly _checked = signal(false);

  readonly user = this._user.asReadonly();
  readonly checked = this._checked.asReadonly();
  readonly loggedIn = computed(() => this._user() !== null);

  /** Restores the session once on startup. A 401 simply means nobody is signed in. */
  restore() {
    return this.api.me().pipe(
      tap((u) => this.set(u)),
      map(() => true),
      catchError(() => of(false)),
      tap(() => this._checked.set(true)),
    );
  }

  set(user: User) {
    this._user.set(user);
    this._checked.set(true);
    this.i18n.use(user.preferredLanguage);
  }

  signOut() {
    this.api.logout().subscribe({
      complete: () => this.clear(),
      error: () => this.clear(),
    });
  }

  clear() {
    this._user.set(null);
    this.router.navigateByUrl('/');
  }
}

export const requireLogin: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.checked()) {
    return auth.loggedIn() || router.parseUrl('/login');
  }
  return auth.restore().pipe(map((ok) => ok || router.parseUrl('/login')));
};

export const redirectIfLoggedIn: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const decide = () => (auth.loggedIn() ? router.parseUrl('/app') : true);
  return auth.checked() ? decide() : auth.restore().pipe(map(decide));
};
