// Shared string cleanup for the testing layer. The browser and the Worker both
// store a tester's name; neither trusts the raw query or the raw body.

const MAX_NAME = 80

/** Trims, drops control characters, and caps the length without cutting a code point. */
export function cleanName(value: string): string {
  const stripped = value.replace(/[\u0000-\u001F\u007F]/g, "").trim()
  return Array.from(stripped).slice(0, MAX_NAME).join("")
}
