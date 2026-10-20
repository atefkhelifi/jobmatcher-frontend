import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="stack-sm">
      <h1>404</h1>
      <p class="muted">{{ i18n.t('common.notFound') }}</p>
      <a class="btn" routerLink="/">{{ i18n.t('common.home') }}</a>
    </section>
  `,
})
export class NotFound {
  protected readonly i18n = inject(I18n);
}
