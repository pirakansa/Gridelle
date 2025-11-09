// File Header: Utility helpers for clearing client-side storage artifacts.
import { clearStoredGithubToken, setLoginMode } from '../services/authService'
import { BUFFER_STORAGE_KEY, STORAGE_NAMESPACE_PREFIX, TABLE_STORAGE_KEY } from './storageKeys'

const LOCAL_STORAGE_KEYS = [TABLE_STORAGE_KEY, BUFFER_STORAGE_KEY]

function removeNamespacedEntries(storage: Storage, prefix: string): void {
  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => {
      try {
        storage.removeItem(key)
      } catch (error) {
        console.error('ストレージ項目の削除に失敗しました', error)
      }
    })
  } catch (error) {
    console.error('ストレージの走査に失敗しました', error)
  }
}

function removeKnownEntries(storage: Storage, keys: string[]): void {
  keys.forEach((key) => {
    try {
      storage.removeItem(key)
    } catch (error) {
      console.error('ストレージの削除に失敗しました', error)
    }
  })
}

// Function Header: Clears Gridelle-specific data from local/session storage after logout.
export function clearAppStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    clearStoredGithubToken()
  } catch (error) {
    console.error('GitHub トークンの削除に失敗しました', error)
  }

  try {
    setLoginMode(null)
  } catch (error) {
    console.error('ログイン種別の削除に失敗しました', error)
  }

  let localStorageRef: Storage | null = null
  try {
    localStorageRef = window.localStorage
  } catch (error) {
    console.error('ローカルストレージへのアクセスに失敗しました', error)
  }

  if (localStorageRef) {
    removeKnownEntries(localStorageRef, LOCAL_STORAGE_KEYS)
    removeNamespacedEntries(localStorageRef, STORAGE_NAMESPACE_PREFIX)
  }

  let sessionStorageRef: Storage | null = null
  try {
    sessionStorageRef = window.sessionStorage
  } catch (error) {
    console.error('セッションストレージへのアクセスに失敗しました', error)
  }

  if (sessionStorageRef) {
    removeNamespacedEntries(sessionStorageRef, STORAGE_NAMESPACE_PREFIX)
  }
}
