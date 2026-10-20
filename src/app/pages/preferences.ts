import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api, Preferences, problemMessage } from '../core/api';
import { I18n, Key } from '../core/i18n';

const lines = (s: string): string[] =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const codes = (s: string): string[] =>
  s
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
const num = (v: number | null | ''): number | null => (v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

const CONTRACTS = ['permanent', 'fixed_term', 'contract', 'freelance', 'internship', 'apprenticeship'] as const;
const MODES = ['remote', 'hybrid', 'onsite'] as const;

@Component({
  selector: 'app-preferences',
  imports: [ReactiveFormsModule],
  styles: `
    .opts { display: flex; flex-wrap: wrap; gap: 8px 20px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 12px; }
  `,
  template: `
    <form class="stack" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="stack-sm">
        <h1>{{ i18n.t('pref.title') }}</h1>
        <p class="muted">{{ i18n.t('pref.intro') }}</p>
      </div>

      @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }
      @if (saved()) { <p class="banner ok" role="status">{{ i18n.t('pref.saved') }}</p> }

      @if (loading()) {
        <p class="muted">{{ i18n.t('common.loading') }}</p>
      } @else {
        <section class="card">
          <label for="titles">{{ i18n.t('pref.titles') }}<textarea id="titles" rows="3" formControlName="titles"></textarea></label>
          <label for="tech">{{ i18n.t('pref.tech') }}<textarea id="tech" rows="3" formControlName="tech"></textarea></label>
          <label for="seniority">{{ i18n.t('pref.seniority') }}
            <select id="seniority" formControlName="seniority">
              <option value="">{{ i18n.t('pref.any') }}</option>
              <option value="junior">{{ i18n.t('pref.junior') }}</option>
              <option value="mid">{{ i18n.t('pref.mid') }}</option>
              <option value="senior">{{ i18n.t('pref.senior') }}</option>
              <option value="lead">{{ i18n.t('pref.lead') }}</option>
            </select>
          </label>
        </section>

        <section class="card">
          <h2>{{ i18n.t('pref.salary') }}</h2>
          <div class="cols">
            <label for="smin">{{ i18n.t('pref.salaryMin') }}<input id="smin" type="number" min="0" formControlName="salaryMin" /></label>
            <label for="smax">{{ i18n.t('pref.salaryMax') }}<input id="smax" type="number" min="0" formControlName="salaryMax" /></label>
            <label for="cur">{{ i18n.t('pref.currency') }}<input id="cur" type="text" maxlength="3" formControlName="currency" placeholder="EUR" /></label>
          </div>
          @if (form.hasError('salaryRange')) { <p class="banner error" role="alert">min &gt; max</p> }
        </section>

        <section class="card">
          <fieldset>
            <legend>{{ i18n.t('pref.contracts') }}</legend>
            <div class="opts">
              @for (c of contracts; track c) {
                <label class="check" [for]="'ct-' + c"><input [id]="'ct-' + c" type="checkbox" [checked]="contractSel().has(c)" (change)="toggle(contractSel, c)" /> {{ i18n.t(ctKey(c)) }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ i18n.t('pref.modes') }}</legend>
            <div class="opts">
              @for (m of modes; track m) {
                <label class="check" [for]="'wm-' + m"><input [id]="'wm-' + m" type="checkbox" [checked]="modeSel().has(m)" (change)="toggle(modeSel, m)" /> {{ i18n.t(wmKey(m)) }}</label>
              }
            </div>
          </fieldset>
        </section>

        <section class="card">
          <label for="countries">{{ i18n.t('pref.countries') }}<input id="countries" type="text" formControlName="countries" [placeholder]="i18n.t('pref.countries.ph')" /></label>
          <label for="locations">{{ i18n.t('pref.locations') }}<textarea id="locations" rows="3" formControlName="locations"></textarea></label>
          <label class="check" for="relocate"><input id="relocate" type="checkbox" formControlName="relocate" /> {{ i18n.t('pref.relocate') }}</label>
          <label for="visa">{{ i18n.t('pref.visa') }}
            <select id="visa" formControlName="visa">
              <option value="">{{ i18n.t('pref.visa.unknown') }}</option>
              <option value="yes">{{ i18n.t('pref.visa.yes') }}</option>
              <option value="no">{{ i18n.t('pref.visa.no') }}</option>
            </select>
          </label>
          <label for="auth">{{ i18n.t('pref.auth') }}<input id="auth" type="text" formControlName="workAuth" placeholder="FR, BE" /></label>
        </section>

        <section class="card">
          <h2>{{ i18n.t('pref.notify') }}</h2>
          <label class="check" for="n1"><input id="n1" type="checkbox" formControlName="notifyMatches" /> {{ i18n.t('pref.notifyMatches') }}</label>
          <label class="check" for="n2"><input id="n2" type="checkbox" formControlName="notifyReminders" /> {{ i18n.t('pref.notifyReminders') }}</label>
        </section>

        <div><button class="btn primary" type="submit" [disabled]="form.invalid || busy()">{{ i18n.t('pref.save') }}</button></div>
      }
    </form>
  `,
})
export class PreferencesPage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly contracts = CONTRACTS;
  protected readonly modes = MODES;
  protected readonly contractSel = signal<Set<string>>(new Set());
  protected readonly modeSel = signal<Set<string>>(new Set());
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      titles: [''],
      tech: [''],
      seniority: [''],
      salaryMin: [null as number | null, Validators.min(0)],
      salaryMax: [null as number | null, Validators.min(0)],
      currency: ['', Validators.pattern(/^([A-Za-z]{3})?$/)],
      countries: ['', Validators.pattern(/^(\s*[A-Za-z]{2}\s*([,\s]+|$))*$/)],
      locations: [''],
      relocate: [false],
      visa: [''],
      workAuth: ['', Validators.pattern(/^(\s*[A-Za-z]{2}\s*([,\s]+|$))*$/)],
      notifyMatches: [true],
      notifyReminders: [true],
    },
    {
      validators: (g) => {
        const min = num(g.get('salaryMin')?.value);
        const max = num(g.get('salaryMax')?.value);
        return min !== null && max !== null && min > max ? { salaryRange: true } : null;
      },
    },
  );

  constructor() {
    this.api.getPreferences().subscribe({
      next: (p) => {
        this.apply(p);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected ctKey(c: string): Key {
    return `ct.${c}` as Key;
  }
  protected wmKey(m: string): Key {
    return `wm.${m}` as Key;
  }

  protected toggle(sel: ReturnType<typeof signal<Set<string>>>, value: string) {
    sel.update((s) => {
      const n = new Set(s);
      if (n.has(value)) {
        n.delete(value);
      } else {
        n.add(value);
      }
      return n;
    });
  }

  private apply(p: Preferences) {
    this.contractSel.set(new Set(p.contractTypes));
    this.modeSel.set(new Set(p.workModes));
    this.form.patchValue({
      titles: p.desiredTitles.join('\n'),
      tech: p.desiredTechnologies.join('\n'),
      seniority: p.seniority ?? '',
      salaryMin: p.salaryMin,
      salaryMax: p.salaryMax,
      currency: p.salaryCurrency ?? '',
      countries: p.preferredCountries.join(', '),
      locations: p.preferredLocations.join('\n'),
      relocate: p.willingToRelocate,
      visa: p.needsVisaSponsorship === null ? '' : p.needsVisaSponsorship ? 'yes' : 'no',
      workAuth: p.workAuthorization.join(', '),
      notifyMatches: p.notifyNewMatches,
      notifyReminders: p.notifyReminders,
    });
  }

  protected save() {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const body: Preferences = {
      desiredTitles: lines(v.titles),
      desiredTechnologies: lines(v.tech),
      seniority: v.seniority || null,
      salaryMin: num(v.salaryMin),
      salaryMax: num(v.salaryMax),
      salaryCurrency: v.currency.trim() ? v.currency.trim().toUpperCase() : null,
      contractTypes: [...this.contractSel()],
      workModes: [...this.modeSel()],
      preferredCountries: codes(v.countries),
      preferredLocations: lines(v.locations),
      willingToRelocate: v.relocate,
      needsVisaSponsorship: v.visa === '' ? null : v.visa === 'yes',
      workAuthorization: codes(v.workAuth),
      notifyNewMatches: v.notifyMatches,
      notifyReminders: v.notifyReminders,
    };
    this.busy.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.api.savePreferences(body).subscribe({
      next: (p) => {
        this.apply(p);
        this.saved.set(true);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(problemMessage(e));
        this.busy.set(false);
      },
    });
  }
}
