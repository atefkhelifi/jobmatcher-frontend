/** Saves a binary response (PDF, DOCX, EML) to the user's disk through a temporary object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Saves text to the user's disk. */
export function downloadText(content: string, filename: string, type: string): void {
  downloadBlob(new Blob([content], { type: `${type};charset=utf-8` }), filename);
}
