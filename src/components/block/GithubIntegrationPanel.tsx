// File Header: GitHub integration panel offering blob, repository, and pull request workflows.
import React from 'react'
import {
  GithubRepositoryAccessError,
  fetchFileFromBlobUrl,
  fetchRepositoryFileContent,
  fetchRepositoryTree,
  listRepositoryBranches,
  verifyRepositoryCollaborator,
  type CollaboratorVerificationResult,
} from '../../services/githubRepositoryAccessService'
import IntegrationModeSelector from './githubIntegration/IntegrationModeSelector'
import LastLoadedFileInfo from './githubIntegration/LastLoadedFileInfo'
import BlobUrlIntegrationSection from './githubIntegration/BlobUrlIntegrationSection'
import RepositoryIntegrationSection from './githubIntegration/RepositoryIntegrationSection'
import PullRequestIntegrationSection from './githubIntegration/PullRequestIntegrationSection'
import {
  type GithubIntegrationLoadedFileInfo,
  type IntegrationMode,
  type YamlContentPayload,
} from './githubIntegration/types'

// Function Header: Composes mode selector and per-mode sections for GitHub integration flows.
type GithubIntegrationPanelProps = {
  initialRepositoryUrl?: string
  onRepositoryUrlSubmit?: (_repositoryUrl: string) => void
  onRepositoryAccessConfirmed?: (_result: CollaboratorVerificationResult) => void
  onBranchSelected?: (_branchName: string) => void
  onFileSelected?: (_filePath: string) => void
  onYamlContentLoaded?: (_payload: YamlContentPayload) => void
  lastLoadedFileInfo?: GithubIntegrationLoadedFileInfo | null
}

export type { GithubIntegrationMode, GithubIntegrationLoadedFileInfo } from './githubIntegration/types'

export default function GithubIntegrationPanel({
  initialRepositoryUrl = '',
  onRepositoryUrlSubmit,
  onRepositoryAccessConfirmed,
  onBranchSelected,
  onFileSelected,
  onYamlContentLoaded,
  lastLoadedFileInfo = null,
}: GithubIntegrationPanelProps): React.ReactElement {
  const [integrationMode, setIntegrationMode] = React.useState<IntegrationMode>(
    lastLoadedFileInfo?.mode ?? 'repository',
  )
  const [repositoryUrl, setRepositoryUrl] = React.useState<string>(initialRepositoryUrl)

  React.useEffect(() => {
    setRepositoryUrl(initialRepositoryUrl)
  }, [initialRepositoryUrl])

  const handleChangeMode = React.useCallback((nextMode: IntegrationMode) => {
    setIntegrationMode(nextMode)
  }, [])

  return (
    <div className="flex flex-col gap-6 text-sm text-slate-700" data-testid="github-integration-panel">
      <IntegrationModeSelector currentMode={integrationMode} onModeChange={handleChangeMode} />

      {lastLoadedFileInfo && <LastLoadedFileInfo lastLoadedFileInfo={lastLoadedFileInfo} />}

      {integrationMode === 'blob-url' && (
        <BlobUrlIntegrationSection
          onFileSelected={onFileSelected}
          onYamlContentLoaded={onYamlContentLoaded}
          services={{
            GithubRepositoryAccessError,
            fetchFileFromBlobUrl,
          }}
        />
      )}

      {integrationMode === 'repository' && (
        <RepositoryIntegrationSection
          repositoryUrl={repositoryUrl}
          onRepositoryUrlChange={setRepositoryUrl}
          onRepositoryUrlSubmit={onRepositoryUrlSubmit}
          onRepositoryAccessConfirmed={onRepositoryAccessConfirmed}
          onBranchSelected={onBranchSelected}
          onFileSelected={onFileSelected}
          onYamlContentLoaded={onYamlContentLoaded}
          services={{
            GithubRepositoryAccessError,
            verifyRepositoryCollaborator,
            listRepositoryBranches,
            fetchRepositoryTree,
            fetchRepositoryFileContent,
          }}
        />
      )}

      {integrationMode === 'pull-request' && <PullRequestIntegrationSection />}
    </div>
  )
}
