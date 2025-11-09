// File Header: Displays authenticated user details and offers logout controls.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'
import type { LoginMode } from '../../../services/authService'

type UserSectionProps = {
  loginMode: LoginMode | null
  userDisplayName: string | null
  userEmail: string | null
  onLogout: () => Promise<void>
  isLoggingOut: boolean
  logoutError: string | null
}

const loginModeLabelMap: Record<Exclude<LoginMode, null>, string> = {
  github: 'GitHub OAuth',
  guest: 'ゲスト',
}

// Function Header: Renders the user information panel with logout action.
export default function UserSection({
  loginMode,
  userDisplayName,
  userEmail,
  onLogout,
  isLoggingOut,
  logoutError,
}: UserSectionProps): React.ReactElement {
  const displayName = userDisplayName?.trim() || (loginMode === 'guest' ? 'ゲストユーザー' : '未設定')
  const email = userEmail?.trim() || '未設定'
  const loginModeLabel = loginMode ? loginModeLabelMap[loginMode] : '未ログイン'

  const handleLogoutClick = React.useCallback(() => {
    void onLogout()
  }, [onLogout])

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          <div>
            <span className="text-base font-semibold text-slate-800">ユーザー情報</span>
          </div>
          <dl className="grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1" data-testid="user-profile-details">
            <dt className="font-medium text-slate-500">ログイン種別</dt>
            <dd data-testid="user-login-mode">{loginModeLabel}</dd>
            <dt className="font-medium text-slate-500">表示名</dt>
            <dd data-testid="user-display-name">{displayName}</dd>
            <dt className="font-medium text-slate-500">メール</dt>
            <dd data-testid="user-email">{email}</dd>
          </dl>
          {logoutError && (
            <p className="text-sm text-red-600" role="alert" data-testid="logout-error">
              {logoutError}
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <Button
            type="button"
            variant="ghost"
            className="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700 disabled:border-slate-200 disabled:text-slate-400"
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            data-testid="logout-button"
          >
            {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
          </Button>
          <span className="text-xs text-slate-400">ログアウトするとログイン画面に移動します。</span>
        </div>
      </div>
    </MenuSectionCard>
  )
}
