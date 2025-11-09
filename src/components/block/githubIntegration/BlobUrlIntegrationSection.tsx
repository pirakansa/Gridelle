// File Header: Handles GitHub blob URL based file loading workflow.
import React from 'react'
import Button from '../../atom/Button'
import TextInput from '../../atom/TextInput'
import type {
  GithubBlobCoordinates,
  GithubRepositoryAccessError,
  GithubRepositoryAccessErrorCode,
} from '../../../services/githubRepositoryAccessService'
import { type YamlContentPayload } from './types'

// Function Header: Renders form inputs and handles submission for blob URL loading.
type BlobUrlIntegrationSectionProps = {
  onFileSelected?: (_filePath: string) => void
  onYamlContentLoaded?: (_payload: YamlContentPayload) => void
  services: BlobUrlIntegrationServices
}

type BlobUrlIntegrationServices = {
  GithubRepositoryAccessError: new (
    _message: string,
    _code: GithubRepositoryAccessErrorCode,
  ) => GithubRepositoryAccessError
  fetchFileFromBlobUrl: (
    _blobUrl: string,
  ) => Promise<{ content: string; coordinates: GithubBlobCoordinates }>
}

export default function BlobUrlIntegrationSection({
  onFileSelected,
  onYamlContentLoaded,
  services,
}: BlobUrlIntegrationSectionProps): React.ReactElement {
  const [blobUrl, setBlobUrl] = React.useState<string>('')
  const [isBlobLoading, setIsBlobLoading] = React.useState<boolean>(false)
  const [blobErrorMessage, setBlobErrorMessage] = React.useState<string | null>(null)
  const [blobSuccessMessage, setBlobSuccessMessage] = React.useState<string | null>(null)

  const handleBlobSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = blobUrl.trim()
      if (!trimmedUrl) {
        return
      }

      setIsBlobLoading(true)
      setBlobErrorMessage(null)
      setBlobSuccessMessage(null)

      try {
        const result = await services.fetchFileFromBlobUrl(trimmedUrl)
        setBlobSuccessMessage(`${result.coordinates.filePath} を読み込みました。`)
        onFileSelected?.(result.coordinates.filePath)
        onYamlContentLoaded?.({
          yaml: result.content,
          repository: {
            owner: result.coordinates.owner,
            repository: result.coordinates.repository,
          },
          branch: result.coordinates.ref,
          filePath: result.coordinates.filePath,
          mode: 'blob-url',
        })
      } catch (error) {
        if (error instanceof services.GithubRepositoryAccessError) {
          setBlobErrorMessage(error.message)
        } else {
          setBlobErrorMessage('Blob URL からファイルを取得できませんでした。時間を置いて再度お試しください。')
        }
      } finally {
        setIsBlobLoading(false)
      }
    },
    [blobUrl, onFileSelected, onYamlContentLoaded, services],
  )

  return (
    <section className="flex flex-col gap-3">
      <form className="flex flex-col gap-3" onSubmit={handleBlobSubmit} data-testid="blob-url-form">
        <label htmlFor="blob-url" className="text-sm font-medium text-slate-800">
          Blob URL を入力
        </label>
        <TextInput
          id="blob-url"
          name="blobUrl"
          value={blobUrl}
          onChange={(event) => setBlobUrl(event.target.value)}
          placeholder="https://github.com/owner/repository/blob/main/path/to/file.yaml"
          fullWidth
          autoComplete="off"
          spellCheck={false}
          data-testid="blob-url-input"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!blobUrl.trim() || isBlobLoading}>
            {isBlobLoading ? '読み込み中…' : 'Blobを読み込む'}
          </Button>
        </div>
      </form>
      {blobErrorMessage && (
        <p className="text-sm text-red-600" role="alert" data-testid="blob-url-error">
          {blobErrorMessage}
        </p>
      )}
      {blobSuccessMessage && (
        <p className="text-sm text-emerald-600" role="status" data-testid="blob-url-success">
          {blobSuccessMessage}
        </p>
      )}
    </section>
  )
}
