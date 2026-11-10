// For values placed inside HTML strings, such as report print windows.
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
