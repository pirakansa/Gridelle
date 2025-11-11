// File Header: Displays authenticated user details and offers logout controls.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'
import type { LoginMode } from '../../../services/auth'
import { useI18n } from '../../../utils/i18n'

type UserSectionProps = {
  loginMode: LoginMode | null
  userEmail: string | null
  onLogout: () => Promise<void>
  isLoggingOut: boolean
  logoutError: string | null
}

// Function Header: Renders the user information panel with logout action.
export default function UserSection({
  loginMode,
  userEmail,
  onLogout,
  isLoggingOut,
  logoutError,
}: UserSectionProps): React.ReactElement {
  const { select } = useI18n()
  const email = userEmail?.trim() || select('未設定', 'Not set')
  const loginModeLabel = loginMode
    ? loginMode === 'github'
      ? select('GitHub OAuth', 'GitHub OAuth')
      : select('ゲスト', 'Guest')
    : select('未ログイン', 'Signed out')

  const handleLogoutClick = React.useCallback(() => {
    void onLogout()
  }, [onLogout])

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          <div>
            <span className="text-base font-semibold text-slate-800">
              {select('ユーザー情報', 'User details')}
            </span>
          </div>
          <dl className="grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1" data-testid="user-profile-details">
            <dt className="font-medium text-slate-500">{select('ログイン種別', 'Login type')}</dt>
            <dd data-testid="user-login-mode">{loginModeLabel}</dd>
            <dt className="font-medium text-slate-500">{select('メール', 'Email')}</dt>
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
            {isLoggingOut ? select('ログアウト中...', 'Signing out...') : select('ログアウト', 'Sign out')}
          </Button>
          <span className="text-xs text-slate-400">
            {select('ログアウトするとログイン画面に移動します。', 'You will be redirected to the login page.')}
          </span>
        </div>
      </div>
    </MenuSectionCard>
  )
}
