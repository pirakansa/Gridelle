// File Header: Browser clipboard helper handling graceful degradation.

// Function Header: Copies text to the clipboard when API is available.
export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('クリップボードAPIが利用できません。')
  }
  await navigator.clipboard.writeText(text)
}
