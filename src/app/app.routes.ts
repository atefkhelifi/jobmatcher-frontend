import { Routes } from '@angular/router';
import { redirectIfLoggedIn, requireLogin } from './core/auth';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/landing').then((m) => m.Landing), canActivate: [redirectIfLoggedIn] },
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login), canActivate: [redirectIfLoggedIn] },
  { path: 'register', loadComponent: () => import('./pages/register').then((m) => m.Register), canActivate: [redirectIfLoggedIn] },
  {
    path: 'app',
    canActivate: [requireLogin],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard) },
      { path: 'cvs', loadComponent: () => import('./pages/cv-list').then((m) => m.CvList) },
      { path: 'cvs/compare', loadComponent: () => import('./pages/cv-compare').then((m) => m.CvComparePage) },
      { path: 'cvs/:id', loadComponent: () => import('./pages/cv-review').then((m) => m.CvReview) },
      { path: 'cvs/:id/analysis', loadComponent: () => import('./pages/cv-analysis').then((m) => m.CvAnalysis) },
      { path: 'jobs', loadComponent: () => import('./pages/jobs').then((m) => m.Jobs) },
      { path: 'jobs/:id', loadComponent: () => import('./pages/job-detail').then((m) => m.JobDetailPage) },
      { path: 'applications', loadComponent: () => import('./pages/applications').then((m) => m.Applications) },
      { path: 'applications/:id', loadComponent: () => import('./pages/application-detail').then((m) => m.ApplicationDetailPage) },
      { path: 'learning', loadComponent: () => import('./pages/learning').then((m) => m.LearningPage) },
      { path: 'analytics', loadComponent: () => import('./pages/analytics').then((m) => m.AnalyticsPage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications').then((m) => m.NotificationsPage) },
      { path: 'preferences', loadComponent: () => import('./pages/preferences').then((m) => m.PreferencesPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.Settings) },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
