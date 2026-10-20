import { Injectable, inject, signal } from '@angular/core';
import { Api } from './api';

/** The unread count shown in the header. Refreshed on sign-in and every few minutes while the tab is open. */
@Injectable({ providedIn: 'root' })
export class Notifications {
  private readonly api = inject(Api);
  private readonly _unread = signal(0);
  readonly unread = this._unread.asReadonly();
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    this.refresh();
    if (!this.timer) {
      this.timer = setInterval(() => this.refresh(), 5 * 60_000);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._unread.set(0);
  }

  refresh() {
    this.api.unreadNotifications().subscribe({
      next: (r) => this._unread.set(r.unread),
      error: () => undefined,
    });
  }

  set(n: number) {
    this._unread.set(Math.max(0, n));
  }
}
