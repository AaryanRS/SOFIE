/**
 * export.ts
 *
 * Client-side file export utilities.
 * Uses browser Blob and URL.createObjectURL without any remote network requests.
 */

/**
 * Computes the sanitized output filename.
 * E.g., 'customer_data.txt' -> 'customer_data.sanitized.txt'
 *       'records.csv'       -> 'records.sanitized.csv'
 *       null (raw paste)    -> 'sofie-sanitized.txt' (or .csv)
 */
export function getSanitizedFilename(originalFilename: string | null, isCsv: boolean = false): string {
  if (!originalFilename) {
    return isCsv ? 'sofie-sanitized.csv' : 'sofie-sanitized.txt';
  }

  const lastDot = originalFilename.lastIndexOf('.');
  if (lastDot === -1) {
    return `${originalFilename}.sanitized.${isCsv ? 'csv' : 'txt'}`;
  }

  const base = originalFilename.slice(0, lastDot);
  const ext = originalFilename.slice(lastDot + 1);
  return `${base}.sanitized.${ext}`;
}

/**
 * Triggers a browser-native download using a Blob and temporary object URL.
 */
export function downloadFile(content: string, filename: string, isCsv: boolean = false): void {
  const mimeType = isCsv ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
