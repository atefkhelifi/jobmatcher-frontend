import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withXsrfConfiguration } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { Auth } from './core/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Restore the session before the first render so the header never flashes the wrong state.
    provideAppInitializer(() => inject(Auth).restore()),
    provideRouter(routes, withComponentInputBinding()),
    // Spring sets XSRF-TOKEN; Angular echoes it in X-XSRF-TOKEN on every same-origin write.
    provideHttpClient(withFetch(), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })),
  ],
};
