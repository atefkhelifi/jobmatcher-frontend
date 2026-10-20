import { TestBed } from '@angular/core/testing';
import { DICTIONARIES, I18n } from './i18n';

describe('I18n', () => {
  it('has the same keys in English and French and no empty strings', () => {
    const en = Object.keys(DICTIONARIES.en).sort();
    const fr = Object.keys(DICTIONARIES.fr).sort();
    expect(fr).toEqual(en);
    for (const lang of ['en', 'fr'] as const) {
      for (const [k, v] of Object.entries(DICTIONARIES[lang])) {
        expect(v.trim().length, `${lang}:${k}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the same placeholders in both languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(DICTIONARIES.en) as (keyof typeof DICTIONARIES.en)[]) {
      expect(ph(DICTIONARIES.fr[k]), k).toEqual(ph(DICTIONARIES.en[k]));
    }
  });

  it('switches language and interpolates parameters', () => {
    const i18n = TestBed.inject(I18n);
    i18n.use('en');
    expect(i18n.t('dash.hello', { name: 'Jane' })).toBe('Hello, Jane');
    i18n.use('fr');
    expect(i18n.t('dash.hello', { name: 'Jane' })).toBe('Bonjour Jane');
    expect(document.documentElement.lang).toBe('fr');
    i18n.use('en');
  });
});
