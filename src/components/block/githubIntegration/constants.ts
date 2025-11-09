// File Header: Constants shared across GitHub integration panel components.
import { type IntegrationMode } from './types'

export const integrationModeMeta: Array<{
  id: IntegrationMode
  label: string
  helper: string
}> = [
  {
    id: 'blob-url',
    label: 'Blob URL',
    helper: '個別ファイルの blob URL を入力して即座に読み込みます。',
  },
  {
    id: 'repository',
    label: 'リポジトリ',
    helper: 'リポジトリとブランチを指定してファイル一覧から選択します。',
  },
  {
    id: 'pull-request',
    label: 'Pull Request',
    helper: 'PR で更新されたファイルを確認する機能を準備中です。',
  },
]
