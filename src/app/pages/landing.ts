import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  styles: `
    .hero { padding-block: 24px 8px; display: grid; gap: 20px; max-width: 760px; }
    .lede { font-size: 18px; color: var(--muted); }
    .features { margin-top: 40px; }
    .feature h3 { font-size: 17px; }
    .feature p { color: var(--muted); }
    .roadmap { margin-top: 32px; }
  `,
  template: `
    <section class="hero">
      <span class="eyebrow">Open source · self-hosted</span>
      <h1>{{ i18n.t('landing.title') }}</h1>
      <p class="lede">{{ i18n.t('landing.lede') }}</p>
      <div class="row">
        <a class="btn primary" routerLink="/register">{{ i18n.t('landing.cta') }}</a>
        <a class="btn ghost" routerLink="/login">{{ i18n.t('landing.have') }}</a>
      </div>
    </section>
    <section class="grid-2 features">
      @for (f of features; track f) {
        <article class="card feature">
          <h3>{{ i18n.t(f.t) }}</h3>
          <p>{{ i18n.t(f.d) }}</p>
        </article>
      }
    </section>
    <p class="banner roadmap">{{ i18n.t('landing.roadmap') }}</p>
  `,
})
export class Landing {
  protected readonly i18n = inject(I18n);
  protected readonly features = [
    { t: 'landing.f1.t', d: 'landing.f1.d' },
    { t: 'landing.f2.t', d: 'landing.f2.d' },
    { t: 'landing.f3.t', d: 'landing.f3.d' },
  ] as const;
}
