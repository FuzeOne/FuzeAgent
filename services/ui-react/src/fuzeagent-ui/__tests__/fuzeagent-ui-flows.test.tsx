import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiAgentTaskOrchestration } from '../MultiAgentTaskOrchestration'
import { MultimodalS3Uploader } from '../MultimodalS3Uploader'
import { MultiTierContextPipeline } from '../MultiTierContextPipeline'
import { AgentPersonaAvatarStudio } from '../AgentPersonaAvatarStudio'

vi.mock('../../services/api', () => {
  const mockApi = {
    createTask: vi.fn().mockResolvedValue({ task_id: 'task_test_01', status: 'created' }),
    assignTask: vi.fn().mockResolvedValue({ status: 'assigned' }),
    getS3StorageQuota: vi.fn().mockResolvedValue({
      organization_id: 'org_default',
      bucket_name: 'fuzeagent-org-default',
      used_bytes: 1975684956,
      used_mb: 1884.16,
      quota_bytes: 5368709120,
      quota_mb: 5120,
      percentage_used: 36.8,
      file_count: 14,
      remaining_bytes: 3393024164,
    }),
    initiateS3MultipartUpload: vi.fn().mockResolvedValue({
      upload_id: 'upload_test_123',
      bucket: 'fuzeagent-org-default',
      key: 'brains/brain_org_global/media/test.mp4',
      part_size_bytes: 5242880,
      total_parts: 2,
      part_urls: [],
    }),
    completeS3MultipartUpload: vi.fn().mockResolvedValue({
      status: 'completed',
      bucket: 'fuzeagent-org-default',
      key: 'brains/brain_org_global/media/test.mp4',
      s3_uri: 's3://fuzeagent-org-default/brains/brain_org_global/media/test.mp4',
    }),
    getBrains: vi.fn().mockResolvedValue([]),
    createBrain: vi.fn().mockResolvedValue({ id: 'brain_new', name: 'New Brain' }),
    associateBrain: vi.fn().mockResolvedValue({ id: 'brain_new', scope: 'team' }),
    distillHierarchicalContext: vi.fn().mockResolvedValue({
      context: '### [ORGANIZATION] Global Brain\nZero trust security rules',
      distilled_context: '### [ORGANIZATION] Global Brain\nZero trust security rules',
      total_tokens: 420,
      tokens_used: 420,
      sources_count: 1,
      sources: [{ brain_id: 'brain_org_global', scope: 'organization', title: 'Security Policy', score: 0.95 }],
      hierarchy: [],
    }),
    promoteChatMemory: vi.fn().mockResolvedValue({
      status: 'promoted',
      session_id: 'sess_test',
      promoted_count: 1,
      promotions: [{ tier: 'team', brain_id: 'brain_team_platform', doc: { title: 'Promoted Insight' } }],
    }),
    getAgentPersonas: vi.fn().mockResolvedValue([]),
    updateAgentPersona: vi.fn().mockResolvedValue({
      agent_id: 'python-dev',
      human_name: 'John',
      role_title: 'Senior Backend Engineer',
    }),
  }
  return {
    api: mockApi,
    apiClient: mockApi,
  }
})

describe('FuzeAgent UI Flows (06, 08, 09, 10)', () => {
  it('Flow 06: renders MultiAgentTaskOrchestration with sandbox pods, priority selector, and terminal', () => {
    const { container } = render(<MultiAgentTaskOrchestration />)
    expect(container.querySelector('[data-frame="06-task-assignment-orchestration"]')).toBeInTheDocument()
    expect(screen.getAllByText(/sbx-py-01/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/CRITICAL/i).length).toBeGreaterThan(0)
  })

  it('Flow 08: renders MultimodalS3Uploader with 5 GB quota bar and multipart queue', () => {
    render(<MultimodalS3Uploader brainId="brain_org_global" brainName="Organization Global Brain" />)
    expect(screen.getAllByText(/fuzeagent-org-default/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/5\.00 GB/i).length).toBeGreaterThan(0)
  })

  it('Flow 09: renders MultiTierContextPipeline with 4-tier hierarchy and RRF distillation', () => {
    render(<MultiTierContextPipeline />)
    expect(screen.getAllByText(/Reciprocal Rank Fusion/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Neo4j/i).length).toBeGreaterThan(0)
  })

  it('Flow 10: renders AgentPersonaAvatarStudio with John/Sarah/Alex/Elena personas and SVG generator', () => {
    const { container } = render(<AgentPersonaAvatarStudio />)
    expect(container.querySelector('#card-python-dev')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('John').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('Sarah').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('Alex').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('Elena').length).toBeGreaterThan(0)

    const regenerateButtons = screen.getAllByText(/Regenerate/i)
    if (regenerateButtons.length > 0) {
      fireEvent.click(regenerateButtons[0])
    }
  })
})
