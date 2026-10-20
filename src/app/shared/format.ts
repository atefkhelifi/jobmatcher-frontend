/** "50,000 – 65,000 EUR per year", or null when the source did not state a salary. */
export function formatSalary(min: number | null, max: number | null, currency: string | null, locale: string): string | null {
  if ((min === null && max === null) || !currency) {
    return null;
  }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const range = min !== null && max !== null && min !== max ? `${n.format(min)} – ${n.format(max)}` : n.format((max ?? min) as number);
  return `${range} ${currency} / ${locale.startsWith('fr') ? 'an' : 'year'}`;
}

/** Only http(s) links are ever rendered as hrefs. */
export function safeUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}
