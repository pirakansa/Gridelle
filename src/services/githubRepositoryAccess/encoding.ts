// File Header: Handles base64 encoding and decoding for GitHub file payloads.
import { GithubRepositoryAccessError } from './errors'

// Function Header: Decodes base64 encoded payloads retrieved from GitHub APIs.
export const decodeBase64Payload = (payload: string): string => {
  const cleaned = payload.replace(/\s+/g, '')

  if (typeof globalThis.atob === 'function') {
    try {
      const binary = globalThis.atob(cleaned)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      const decoder = new TextDecoder()
      return decoder.decode(bytes)
    } catch {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
        'Failed to decode the fetched file.',
      )
    }
  }

  const bufferLike = (globalThis as {
    Buffer?: { from: (_input: string, _encoding: string) => { toString: (_encoding: string) => string } }
  }).Buffer

  if (bufferLike) {
    try {
      return bufferLike.from(cleaned, 'base64').toString('utf-8')
    } catch {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
        'Failed to decode the fetched file.',
      )
    }
  }

  throw new GithubRepositoryAccessError(
    'ファイル内容を解読できませんでした。別の環境で再度お試しください。',
    'file-fetch-failed',
    'Unable to decode the file content. Please try again in a different environment.',
  )
}

// Function Header: Encodes UTF-8 strings into base64 payloads accepted by GitHub APIs.
export const encodeBase64Payload = (content: string): string => {
  if (typeof globalThis.btoa === 'function') {
    try {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(content)
      let binary = ''
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return globalThis.btoa(binary)
    } catch {
      throw new GithubRepositoryAccessError(
        'ファイル内容のエンコードに失敗しました。',
        'file-update-failed',
        'Failed to encode the file content.',
      )
    }
  }

  const bufferLike = (globalThis as {
    Buffer?: { from: (_input: string, _encoding: string) => { toString: (_encoding: string) => string } }
  }).Buffer

  if (bufferLike) {
    try {
      return bufferLike.from(content, 'utf-8').toString('base64')
    } catch {
      throw new GithubRepositoryAccessError(
        'ファイル内容のエンコードに失敗しました。',
        'file-update-failed',
        'Failed to encode the file content.',
      )
    }
  }

  throw new GithubRepositoryAccessError(
    'ファイル内容をエンコードできませんでした。別の環境で再度お試しください。',
    'file-update-failed',
    'Unable to encode the file content. Please try again in a different environment.',
  )
}
