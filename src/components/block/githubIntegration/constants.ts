// File Header: Constants shared across GitHub integration panel components.
import { type IntegrationMode } from './types'

export const integrationModeMeta: Array<{
  id: IntegrationMode
  label: { ja: string; en: string }
  helper: { ja: string; en: string }
}> = [
  {
    id: 'blob-url',
    label: { ja: 'Blob URL', en: 'Blob URL' },
    helper: {
      ja: '個別ファイルの blob URL を入力して即座に読み込みます。',
      en: 'Load a file instantly by pasting its blob URL.',
    },
  },
  {
    id: 'repository',
    label: { ja: 'リポジトリ', en: 'Repository' },
    helper: {
      ja: 'リポジトリとブランチを指定してファイル一覧から選択します。',
      en: 'Choose a repository and branch, then select a file from the tree.',
    },
  },
  {
    id: 'pull-request',
    label: { ja: 'Pull Request', en: 'Pull Request' },
    helper: {
      ja: 'Pull Request で変更された YAML ファイルを選んで読み込みます。',
      en: 'Pick YAML files changed in a pull request and load them.',
    },
  },
]
