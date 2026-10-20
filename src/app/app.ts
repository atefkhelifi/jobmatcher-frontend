import { Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './core/auth';
import { I18n } from './core/i18n';
import { Notifications } from './core/notifications';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    header { background: var(--surface); border-bottom: 1px solid var(--line); position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; min-height: 56px; padding-block: 8px; }
    .brand { font: 700 18px/1 var(--display); color: var(--fg); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .brand i { width: 22px; height: 22px; border-radius: 6px; background: var(--accent); display: inline-block; position: relative; }
    .brand i::after { content: ''; position: absolute; inset: 6px; border-radius: 2px; background: var(--attn); }
    nav { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
    nav a { color: var(--muted); text-decoration: none; font-weight: 500; padding: 8px 10px; border-radius: 6px; }
    nav a:hover { color: var(--fg); background: var(--surface-2); }
    nav a.active { color: var(--accent); background: var(--accent-soft); }
    .bell { position: relative; }
    .bell .count { background: var(--attn); color: #000; border-radius: 10px; font: 600 11px var(--mono); padding: 1px 6px; margin-left: 4px; }
    .lang { display: inline-flex; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
    .lang button { border: 0; background: transparent; color: var(--muted); padding: 6px 10px; font: 500 12px var(--mono); cursor: pointer; }
    .lang button[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); }
    main { flex: 1; padding-block: 32px 56px; }
    footer { border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; padding-block: 20px; }
    .skip { position: absolute; left: -999px; top: 0; background: var(--accent); color: var(--accent-fg); padding: 8px 12px; z-index: 10; }
    .skip:focus { left: 8px; top: 8px; }
  `,
  template: `
    <a class="skip" href="#main">{{ i18n.t('nav.skip') }}</a>
    <header>
      <div class="container bar">
        <a class="brand" [routerLink]="auth.loggedIn() ? '/app' : '/'"><i aria-hidden="true"></i>JobMatcher AI</a>
        @if (auth.loggedIn()) {
          <nav aria-label="Main">
            <a routerLink="/app" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ i18n.t('nav.dashboard') }}</a>
            <a routerLink="/app/jobs" routerLinkActive="active">{{ i18n.t('nav.jobs') }}</a>
            <a routerLink="/app/applications" routerLinkActive="active">{{ i18n.t('nav.applications') }}</a>
            <a routerLink="/app/learning" routerLinkActive="active">{{ i18n.t('nav.learning') }}</a>
            <a routerLink="/app/analytics" routerLinkActive="active">{{ i18n.t('nav.analytics') }}</a>
            <a routerLink="/app/cvs" routerLinkActive="active">{{ i18n.t('nav.cvs') }}</a>
            <a routerLink="/app/preferences" routerLinkActive="active">{{ i18n.t('nav.preferences') }}</a>
            <a routerLink="/app/settings" routerLinkActive="active">{{ i18n.t('nav.settings') }}</a>
          </nav>
        } @else {
          <nav aria-label="Main"></nav>
        }
        <div class="lang" role="group" aria-label="Language">
          <button type="button" [attr.aria-pressed]="i18n.lang() === 'en'" (click)="i18n.use('en')">EN</button>
          <button type="button" [attr.aria-pressed]="i18n.lang() === 'fr'" (click)="i18n.use('fr')">FR</button>
        </div>
        @if (auth.loggedIn()) {
          <a class="btn small bell" routerLink="/app/notifications" [attr.aria-label]="i18n.t('nav.notifications') + ' (' + notifications.unread() + ')'">
            {{ i18n.t('nav.notifications') }}@if (notifications.unread() > 0) { <span class="count" aria-hidden="true">{{ notifications.unread() }}</span> }
          </a>
          <button class="btn small" type="button" (click)="auth.signOut()">{{ i18n.t('nav.signout') }}</button>
        } @else {
          <a class="btn small" routerLink="/login">{{ i18n.t('nav.signin') }}</a>
          <a class="btn small primary" routerLink="/register">{{ i18n.t('nav.signup') }}</a>
        }
      </div>
    </header>
    <main id="main" class="container"><router-outlet /></main>
    <footer><div class="container">{{ i18n.t('foot.disclaimer') }}</div></footer>
  `,
})
export class App {
  protected readonly auth = inject(Auth);
  protected readonly i18n = inject(I18n);
  protected readonly notifications = inject(Notifications);

  constructor() {
    effect(() => {
      if (this.auth.loggedIn()) {
        this.notifications.start();
      } else {
        this.notifications.stop();
      }
    });
  }
}
