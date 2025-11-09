// File Header: File transfer helpers for reading uploads and triggering downloads.

// Function Header: Reads the provided file as UTF-8 text.
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('ファイルの読み込みに失敗しました。'))
    reader.readAsText(file)
  })
}

// Function Header: Triggers a browser download for the given content.
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
