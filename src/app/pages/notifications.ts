import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, AppNotification, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';
import { Notifications } from '../core/notifications';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, RouterLink],
  styles: `
    ul { list-style: none; padding: 0; display: grid; gap: 8px; }
    li { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; display: grid; gap: 6px; }
    li.unread { border-left: 4px solid var(--accent); }
    .when { font-size: 12px; color: var(--muted); }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
  template: `
    <div class="stack">
      <div class="row between">
        <h1>{{ i18n.t('notif.title') }}</h1>
        @if (items().length > 0) { <button class="btn" type="button" (click)="markAll()">{{ i18n.t('notif.markAll') }}</button> }
      </div>
      <p class="muted">{{ i18n.t('notif.hint') }} <a routerLink="/app/preferences">{{ i18n.t('nav.preferences') }}</a></p>
      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
      @if (loaded() && items().length === 0) { <p class="muted">{{ i18n.t('notif.empty') }}</p> }
      <ul>
        @for (n of items(); track n.id) {
          <li [class.unread]="!n.readAt">
            <span>{{ message(n) }}</span>
            <span class="when">{{ n.createdAt | date: 'medium' }}</span>
            <div class="acts">
              @if (n.link) { <a class="btn small" [routerLink]="n.link" (click)="read(n)">{{ i18n.t('notif.open') }}</a> }
              <button class="btn small" type="button" (click)="remove(n)">{{ i18n.t('notif.delete') }}</button>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
})
export class NotificationsPage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly badge = inject(Notifications);
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.notifications().subscribe({
      next: (l) => {
        this.items.set(l);
        this.loaded.set(true);
        this.badge.set(l.filter((n) => !n.readAt).length);
      },
      error: (e) => {
        this.loaded.set(true);
        this.error.set(problemMessage(e));
      },
    });
  }

  protected message(n: AppNotification): string {
    const key = `notif.${n.code}` as Key;
    const p = n.params;
    const title = String(p['title'] ?? '');
    const company = p['company'] ? ` · ${String(p['company'])}` : '';
    if (n.code === 'alert.newMatches' || n.code === 'alert.newOffers') {
      const list = (p['top'] ?? p['titles'] ?? []) as { title: string; company?: string; score?: number }[];
      const top = list.map((j) => `${j.title}${j.company ? ' · ' + j.company : ''}${j.score !== undefined ? ` (${j.score})` : ''}`).join('; ');
      return this.i18n.t(key, { count: Number(p['count'] ?? 0), search: String(p['search'] ?? ''), minScore: Number(p['minScore'] ?? 0), top });
    }
    if (n.code === 'reminder.due') {
      return this.i18n.t(key, { title, company });
    }
    if (n.code === 'interview.soon') {
      const when = new Date(String(p['scheduledAt'] ?? '')).toLocaleString(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-GB');
      return this.i18n.t(key, { title, company, when });
    }
    return this.i18n.t('notif.unknown');
  }

  protected read(n: AppNotification) {
    if (n.readAt) {
      return;
    }
    this.api.markNotificationRead(n.id).subscribe(() => {
      this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      this.badge.set(this.items().filter((x) => !x.readAt).length);
    });
  }

  protected markAll() {
    this.api.markAllNotificationsRead().subscribe(() => {
      this.items.update((l) => l.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      this.badge.set(0);
    });
  }

  protected remove(n: AppNotification) {
    this.api.deleteNotification(n.id).subscribe(() => {
      this.items.update((l) => l.filter((x) => x.id !== n.id));
      this.badge.set(this.items().filter((x) => !x.readAt).length);
    });
  }
}
