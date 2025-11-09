// File Header: Page-level component implementing the Firebase GitHub login experience.
import React from 'react'
import { GithubAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import styles from './login.module.scss'
import {
  clearStoredGithubToken,
  getFirebaseAuth,
  getGithubAuthProvider,
  getStoredGithubToken,
  setStoredGithubToken,
} from '../../services/authService'

const UNAUTHENTICATED_DETAILS = '未ログインです。'
const auth = getFirebaseAuth()
const provider = getGithubAuthProvider()

/**
 * Masks a GitHub token for safe display in the UI.
 * @param {string} token GitHub access token.
 * @returns {string} Masked token preview.
 */
function maskGithubToken(token: string): string {
  if (token.length <= 8) {
    return `${token.slice(0, 4)}...`
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

// Function Header: Renders the login UI and wires Firebase authentication flows to the buttons.
export default function App(): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null)
  const [statusMessage, setStatusMessage] = React.useState('現在のログイン状態を取得しています…')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState<boolean>(false)
  const [accessToken, setAccessToken] = React.useState<string | null>(() => getStoredGithubToken())

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setIsBusy(false)
        setErrorMessage(null)

        if (currentUser) {
          setStatusMessage(`${currentUser.displayName ?? 'GitHub ユーザー'} としてログインしています。`)
          setAccessToken(getStoredGithubToken())
          return
        }

        setStatusMessage('未ログインです。GitHub でログインしてください。')
        clearStoredGithubToken()
        setAccessToken(null)
      },
      (listenerError) => {
        console.error('認証状態の監視でエラーが発生しました', listenerError)
        setStatusMessage('認証状態の取得で問題が発生しました。')
        setErrorMessage('認証状態の確認に失敗しました。ページを再読み込みしてください。')
        setIsBusy(false)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const handleLogin = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      const result = await signInWithPopup(auth, provider)
      const credential = GithubAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken ?? null

      if (!token) {
        throw new Error('GitHub access token is undefined.')
      }

      setStoredGithubToken(token)
      setAccessToken(token)
      setStatusMessage('GitHub ログインに成功しました。トップページへ遷移します。')
      window.location.replace('/top.html')
    } catch (error) {
      console.error('GitHub ログインに失敗しました', error)
      setErrorMessage('ログインに失敗しました。時間を置いて再度お試しください。')
    }
    finally {
      setIsBusy(false)
    }
  }, [])

  const handleLogout = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      await signOut(auth)
      clearStoredGithubToken()
      setAccessToken(null)
      setStatusMessage('ログアウトしました。GitHub でログインしてください。')
    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました', error)
      setErrorMessage('ログアウトに失敗しました。ブラウザを再読み込みしてください。')
    }
    finally {
      setIsBusy(false)
    }
  }, [])

  const detailsText = React.useMemo(() => {
    if (!user) {
      return UNAUTHENTICATED_DETAILS
    }

    const lines = [
      `UID: ${user.uid}`,
      `表示名: ${user.displayName ?? '未設定'}`,
      `メール: ${user.email ?? '未設定'}`,
      `アイコン: ${user.photoURL ?? '未設定'}`,
      `プロバイダ: GitHub`,
      `アクセストークン: ${accessToken ? maskGithubToken(accessToken) : '未取得'}`,
    ]

    return lines.join('\n')
  }, [user, accessToken])

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Gridelle ログイン</h1>
          <p className={styles.description}>
            GitHub アカウントでログインして Gridelle を利用できます。
          </p>
        </header>
        <section className={styles.actions}>
          {!user && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleLogin}
              disabled={isBusy}
            >
              GitHub でログイン
            </button>
          )}
          {user && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleLogout}
              disabled={isBusy}
            >
              ログアウト
            </button>
          )}
        </section>
        <section className={styles.detailsBlock}>
          <p className={styles.status}>{statusMessage}</p>
          {errorMessage && <p className={styles.error}>{errorMessage}</p>}
          <h2 className={styles.detailsTitle}>ユーザー情報</h2>
          <pre className={styles.details}>{detailsText}</pre>
        </section>
        <footer className={styles.footer}>
          <a className={styles.link} href="/index.html">
            トップへ戻る
          </a>
          <a
            className={styles.link}
            href="https://github.com/login"
            target="_blank"
            rel="noreferrer"
          >
            GitHub サインアップ
          </a>
        </footer>
      </div>
    </div>
  )
}
