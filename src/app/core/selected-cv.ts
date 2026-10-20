import { Injectable, signal } from '@angular/core';

/** The CV the user compares offers against. Remembered in this browser only; the server never needs it. */
@Injectable({ providedIn: 'root' })
export class SelectedCv {
  private readonly _id = signal<string | null>(read());
  readonly id = this._id.asReadonly();

  select(id: string | null) {
    this._id.set(id);
    try {
      if (id) {
        localStorage.setItem('jm.cv', id);
      } else {
        localStorage.removeItem('jm.cv');
      }
    } catch {
      /* storage can be unavailable; the choice then lasts for this visit only */
    }
  }
}

function read(): string | null {
  try {
    return localStorage.getItem('jm.cv');
  } catch {
    return null;
  }
}
