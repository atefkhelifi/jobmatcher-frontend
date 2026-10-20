import { formatSalary, safeUrl } from './format';

describe('formatSalary', () => {
  it('returns null when the source stated nothing', () => {
    expect(formatSalary(null, null, null, 'en')).toBeNull();
    expect(formatSalary(50000, 60000, null, 'en')).toBeNull();
  });

  it('formats ranges and single values per locale', () => {
    expect(formatSalary(50000, 65000, 'EUR', 'en')).toBe('50,000 – 65,000 EUR / year');
    expect(formatSalary(null, 70000, 'EUR', 'en')).toBe('70,000 EUR / year');
    expect(formatSalary(40000, 40000, 'EUR', 'fr')).toContain('EUR / an');
  });
});

describe('safeUrl', () => {
  it('only lets http and https through', () => {
    expect(safeUrl('https://example.org/job')).toBe('https://example.org/job');
    expect(safeUrl('http://example.org')).toBe('http://example.org');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,x')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});
