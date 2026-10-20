import { HttpErrorResponse } from '@angular/common/http';
import { problemMessage } from './api';

describe('problemMessage', () => {
  it('prefers the server detail', () => {
    const e = new HttpErrorResponse({ status: 422, error: { detail: 'Only PDF and DOCX files are accepted.' } });
    expect(problemMessage(e)).toBe('Only PDF and DOCX files are accepted.');
  });

  it('lists field errors for validation failures', () => {
    const e = new HttpErrorResponse({ status: 400, error: { fields: { password: 'must be 12 to 128 characters' } } });
    expect(problemMessage(e)).toBe('password: must be 12 to 128 characters');
  });

  it('explains an unreachable server', () => {
    expect(problemMessage(new HttpErrorResponse({ status: 0 }))).toContain('cannot be reached');
  });

  it('falls back for unknown errors', () => {
    expect(problemMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});
