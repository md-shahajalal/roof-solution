import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'R&M Roofing Solutions — Roofing contractor serving California',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  { path: '**', redirectTo: '' },
];
