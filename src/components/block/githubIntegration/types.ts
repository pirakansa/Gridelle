// File Header: Type definitions for GitHub integration panel components.
import { type GithubRepositoryCoordinates } from '../../../services/githubRepositoryAccessService'

export type IntegrationMode = 'blob-url' | 'repository' | 'pull-request'

export type LoadedFileInfo = {
  repository: GithubRepositoryCoordinates
  branch: string
  filePath: string
  mode: IntegrationMode
}

export type YamlContentPayload = {
  yaml: string
  repository: GithubRepositoryCoordinates
  branch: string
  filePath: string
  mode: IntegrationMode
}

export type LocalizedNotice = {
  tone: 'success' | 'error'
  message: {
    ja: string
    en: string
  }
}

export type GithubIntegrationMode = IntegrationMode
export type GithubIntegrationLoadedFileInfo = LoadedFileInfo
export type GithubIntegrationSaveNotice = LocalizedNotice
