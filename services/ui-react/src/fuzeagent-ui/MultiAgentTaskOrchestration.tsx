import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { api } from '../config/api'
import type { Task, Agent } from '../types'

export type PodStatus = 'READY' | 'ACTIVE' | 'STANDBY'
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ExecutionMode = 'Parallel Fan-Out' | 'Sequential Pipeline' | 'Consensus Review'
export type MemoryScope = 'Tier 1-4 Full Hierarchy' | 'Team + Agent Scoped' | 'Ephemeral Sandbox Only'

export interface SandboxPod {
  id: string
  name: string
  agentInstance: string
  avatar: string
  specialty: string
  status: PodStatus
  currentTask?: string
  stepProgress?: string
}

export interface PriorityCardOption {
  level: PriorityLevel
  numericValue: number
  sla: string
  tokenConcurrency: string
  accentColor: string
  bgTint: string
}

export interface OrchestratedSubtask {
  podId: string
  podName: string
  label: string
  progress: number
  status: 'queued' | 'executing' | 'completed'
}

export interface OrchestratedTaskItem {
  id: string
  title: string
  objective: string
  branch: string
  priority: PriorityLevel
  executionMode: ExecutionMode
  memoryScope: MemoryScope
  assignedPods: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
  subtasks: OrchestratedSubtask[]
}

export interface TerminalLogEntry {
  id: string
  timestamp: string
  podId: string
  tag: 'DISPATCH' | 'SANDBOX' | 'CONNECT' | 'STREAM' | 'TOKEN' | 'VERIFY' | 'SYNC'
  message: string
}

export const SANDBOX_PODS: SandboxPod[] = [
  {
    id: 'sbx-py-01',
    name: 'Python Backend Pod',
    agentInstance: 'fastapi-ml-agent-prod',
    avatar: 'PY',
    specialty: 'Python FastAPI & ML Specialist',
    status: 'ACTIVE',
    currentTask: 'Task #1042',
    stepProgress: 'Step 2/4',
  },
  {
    id: 'sbx-ui-04',
    name: 'React Frontend Pod',
    agentInstance: 'react-ui-specialist-04',
    avatar: 'UI',
    specialty: 'React 18, TypeScript & Design System',
    status: 'READY',
    currentTask: 'Awaiting dispatch',
    stepProgress: 'Ready',
  },
  {
    id: 'sbx-qa-02',
    name: 'Playwright QA Pod',
    agentInstance: 'qa-regression-01',
    avatar: 'QA',
    specialty: 'QA & E2E Test Automation Specialist',
    status: 'READY',
    currentTask: 'Contract suite warm',
    stepProgress: 'Ready',
  },
  {
    id: 'sbx-sec-09',
    name: 'Security Auditor Pod',
    agentInstance: 'k8s-sre-lead-01',
    avatar: 'SEC',
    specialty: 'Kubernetes Platform, SRE & Zero-Trust Audit',
    status: 'STANDBY',
    currentTask: 'Idle · Policy watch',
    stepProgress: 'Standby',
  },
]

export const PRIORITY_CARDS: PriorityCardOption[] = [
  {
    level: 'LOW',
    numericValue: 3,
    sla: 'SLA < 30m · Batch Queue',
    tokenConcurrency: '32k tok/min · 1x stream',
    accentColor: '#64748b',
    bgTint: 'rgba(100, 116, 139, 0.14)',
  },
  {
    level: 'MEDIUM',
    numericValue: 5,
    sla: 'SLA < 10m · Standard Pool',
    tokenConcurrency: '64k tok/min · 2x parallel',
    accentColor: '#29d3e6',
    bgTint: 'rgba(41, 211, 230, 0.12)',
  },
  {
    level: 'HIGH',
    numericValue: 8,
    sla: 'SLA < 2m · Priority Preempt',
    tokenConcurrency: '128k tok/min · 4x fan-out',
    accentColor: '#f59e0b',
    bgTint: 'rgba(245, 158, 11, 0.14)',
  },
  {
    level: 'CRITICAL',
    numericValue: 10,
    sla: 'SLA < 15s · Dedicated Burst',
    tokenConcurrency: '256k tok/min · 8x burst',
    accentColor: '#f26b7a',
    bgTint: 'rgba(242, 107, 122, 0.16)',
  },
]

export const EXECUTION_MODES: Array<{
  mode: ExecutionMode
  description: string
  badge: string
}> = [
  {
    mode: 'Parallel Fan-Out',
    description: 'Broadcasts subtasks simultaneously to all selected pods and merges artifacts.',
    badge: 'CONCURRENT',
  },
  {
    mode: 'Sequential Pipeline',
    description: 'Chains output artifacts from pod to pod in deterministic stage order.',
    badge: 'DAG STAGE',
  },
  {
    mode: 'Consensus Review',
    description: 'Independent pod execution followed by cross-agent verification & quorum vote.',
    badge: 'QUORUM 2/3',
  },
]

export const MEMORY_SCOPES: Array<{
  scope: MemoryScope
  description: string
  tierTag: string
}> = [
  {
    scope: 'Tier 1-4 Full Hierarchy',
    description: 'Org + Domain + Team + Agent vector brains attached via pgvector RAG.',
    tierTag: 'TIER 1–4',
  },
  {
    scope: 'Team + Agent Scoped',
    description: 'Restricts retrieval to current Squad & Agent working memory collections.',
    tierTag: 'TIER 3–4',
  },
  {
    scope: 'Ephemeral Sandbox Only',
    description: 'Zero persistent RAG attachment; isolated in-memory scratchpad only.',
    tierTag: 'ISOLATED',
  },
]

export const apiService = {
  async createTask(payload: {
    title: string
    description: string
    branch: string
    priority: PriorityLevel
    priorityScore: number
    executionMode: ExecutionMode
    memoryScope: MemoryScope
    selectedPods: string[]
    type?: string
  }) {
    try {
      const response = await api.orchestrator.post('/tasks', {
        title: payload.title,
        description: payload.description,
        branch: payload.branch,
        priority: payload.priorityScore,
        priority_tier: payload.priority,
        execution_mode: payload.executionMode,
        memory_scope: payload.memoryScope,
        target_pods: payload.selectedPods,
        type: payload.type || 'multi_agent_orchestration',
        status: 'in_progress',
      })
      return response
    } catch {
      return {
        id: `task-${Math.floor(1043 + Math.random() * 900)}`,
        title: payload.title,
        description: payload.description,
        branch: payload.branch,
        priority: payload.priorityScore,
        status: 'in_progress',
        created_at: new Date().toISOString(),
      }
    }
  },

  async assignTask(
    agentOrPodId: string,
    taskPayload: {
      taskId?: string
      title: string
      description: string
      branch: string
      priority: number
      executionMode: ExecutionMode
      memoryScope: MemoryScope
      selectedPods: string[]
    }
  ) {
    try {
      const response = await api.orchestrator.post(`/agents/${encodeURIComponent(agentOrPodId)}/tasks`, {
        task_id: taskPayload.taskId,
        title: taskPayload.title,
        description: taskPayload.description,
        branch: taskPayload.branch,
        priority: taskPayload.priority,
        execution_mode: taskPayload.executionMode,
        memory_scope: taskPayload.memoryScope,
        assigned_pods: taskPayload.selectedPods,
        type: 'implement_feature',
        status: 'in_progress',
      })
      return response
    } catch {
      return {
        success: true,
        assigned_to: agentOrPodId,
        task_id: taskPayload.taskId || `task-${Date.now()}`,
        dispatched_at: new Date().toISOString(),
      }
    }
  },
}

const INITIAL_ORCHESTRATED_TASKS: OrchestratedTaskItem[] = [
  {
    id: '1042',
    title: 'Run e2e API contract regression & check Los Angeles timezone stream',
    objective:
      'Inspect orchestrator /api/ws/multi-agent streaming latency. Verify token chunk throughput and validate JSON payload format for client-side TimeInZoneCard rendering.',
    branch: 'feat/multi-agent-ws-stream',
    priority: 'HIGH',
    executionMode: 'Parallel Fan-Out',
    memoryScope: 'Tier 1-4 Full Hierarchy',
    assignedPods: ['sbx-py-01', 'sbx-ui-04', 'sbx-qa-02'],
    status: 'in_progress',
    createdAt: new Date(Date.now() - 180000).toISOString(),
    subtasks: [
      {
        podId: 'sbx-py-01',
        podName: 'Python Backend Pod',
        label: 'FastAPI /api/ws/multi-agent token chunking & SLA telemetry',
        progress: 78,
        status: 'executing',
      },
      {
        podId: 'sbx-ui-04',
        podName: 'React Frontend Pod',
        label: 'TimeInZoneCard PDT/UTC-7 schema binding & stream hydration',
        progress: 64,
        status: 'executing',
      },
      {
        podId: 'sbx-qa-02',
        podName: 'Playwright QA Pod',
        label: 'E2E WebSocket contract assertion & latency p95 gate',
        progress: 45,
        status: 'executing',
      },
    ],
  },
  {
    id: '1039',
    title: 'Zero-exposure FuzeKeys secret rotation & pgvector index warmup',
    objective:
      'Validate dynamic secret mount inside sandbox containers and verify Tier 1-4 memory distillation latency under 40ms.',
    branch: 'main',
    priority: 'CRITICAL',
    executionMode: 'Consensus Review',
    memoryScope: 'Tier 1-4 Full Hierarchy',
    assignedPods: ['sbx-py-01', 'sbx-sec-09'],
    status: 'completed',
    createdAt: new Date(Date.now() - 1420000).toISOString(),
    subtasks: [
      {
        podId: 'sbx-py-01',
        podName: 'Python Backend Pod',
        label: 'pgvector HNSW index warmup across 4 memory tiers',
        progress: 100,
        status: 'completed',
      },
      {
        podId: 'sbx-sec-09',
        podName: 'Security Auditor Pod',
        label: 'Verify zero-plaintext env leak in container procfs',
        progress: 100,
        status: 'completed',
      },
    ],
  },
]

const INITIAL_TERMINAL_LOGS: TerminalLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '12:20:04.102',
    podId: 'sbx-py-01',
    tag: 'DISPATCH',
    message: 'Task #1042 queued for fastapi-ml-agent-prod (sbx-py-01)',
  },
  {
    id: 'log-2',
    timestamp: '12:20:04.281',
    podId: 'sbx-py-01',
    tag: 'SANDBOX',
    message: 'Pod agent-sandbox-f892b1 alive in fuzeagent ns · READY',
  },
  {
    id: 'log-3',
    timestamp: '12:20:04.450',
    podId: 'sbx-ui-04',
    tag: 'CONNECT',
    message: 'Attached memory context: Tier 1-4 Full Hierarchy (2 knowledge collections)',
  },
  {
    id: 'log-4',
    timestamp: '12:20:05.110',
    podId: 'sbx-py-01',
    tag: 'STREAM',
    message: 'Opening websocket to /api/ws/multi-agent [Parallel Fan-Out]',
  },
  {
    id: 'log-5',
    timestamp: '12:20:05.340',
    podId: 'sbx-ui-04',
    tag: 'TOKEN',
    message: 'Emitting chunk 1/14: "The current time in Los Angeles..."',
  },
  {
    id: 'log-6',
    timestamp: '12:20:05.610',
    podId: 'sbx-qa-02',
    tag: 'VERIFY',
    message: 'TimeInZoneCard contract matched (PDT / UTC-7) · 0 schema drift',
  },
]

export interface MultiAgentTaskOrchestrationProps {
  tasks?: Task[]
  agents?: Agent[]
  onTaskCreated?: (task: any) => void
  customApiService?: typeof apiService
}

export const MultiAgentTaskOrchestration: React.FC<MultiAgentTaskOrchestrationProps> = ({
  tasks = [],
  agents = [],
  onTaskCreated,
  customApiService = apiService,
}) => {
  const [selectedPods, setSelectedPods] = useState<string[]>(['sbx-py-01', 'sbx-ui-04', 'sbx-qa-02'])
  const [targetAgentSelect, setTargetAgentSelect] = useState<string>('fastapi-ml-agent-prod')
  const [priority, setPriority] = useState<PriorityLevel>('HIGH')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Parallel Fan-Out')
  const [memoryScope, setMemoryScope] = useState<MemoryScope>('Tier 1-4 Full Hierarchy')
  const [title, setTitle] = useState<string>(
    'Run e2e API contract regression & check Los Angeles timezone stream'
  )
  const [objective, setObjective] = useState<string>(
    'Inspect orchestrator /api/ws/multi-agent streaming latency. Verify token chunk throughput and validate JSON payload format for client-side TimeInZoneCard rendering.'
  )
  const [branch, setBranch] = useState<string>('feat/multi-agent-ws-stream')
  const [isDispatching, setIsDispatching] = useState<boolean>(false)
  const [dispatchBanner, setDispatchBanner] = useState<string | null>(null)
  const [activePodFilter, setActivePodFilter] = useState<string>('ALL')
  const [orchestratedTasks, setOrchestratedTasks] = useState<OrchestratedTaskItem[]>(
    INITIAL_ORCHESTRATED_TASKS
  )
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>(INITIAL_TERMINAL_LOGS)

  // Merge any incoming tasks from parent props so existing tasks are visible on the board
  const mergedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return orchestratedTasks
    const existingIds = new Set(orchestratedTasks.map((t) => t.id))
    const mappedExternal: OrchestratedTaskItem[] = tasks
      .filter((t) => !existingIds.has(String(t.id)))
      .map((t) => {
        const prioLevel: PriorityLevel =
          t.priority >= 9 ? 'CRITICAL' : t.priority >= 7 ? 'HIGH' : t.priority >= 4 ? 'MEDIUM' : 'LOW'
        return {
          id: String(t.id),
          title: t.title,
          objective: t.description || 'Autonomous agent task execution',
          branch: 'main',
          priority: prioLevel,
          executionMode: 'Parallel Fan-Out',
          memoryScope: 'Tier 1-4 Full Hierarchy',
          assignedPods: ['sbx-py-01'],
          status: t.status,
          createdAt: t.created_at || new Date().toISOString(),
          subtasks: [
            {
              podId: 'sbx-py-01',
              podName: t.assigned_agent_name || 'Python Backend Pod',
              label: t.title,
              progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 65 : 20,
              status:
                t.status === 'completed'
                  ? 'completed'
                  : t.status === 'in_progress'
                  ? 'executing'
                  : 'queued',
            },
          ],
        }
      })
    return [...orchestratedTasks, ...mappedExternal]
  }, [orchestratedTasks, tasks])

  // Simulate live subtask progress increments for active tasks
  useEffect(() => {
    const timer = setInterval(() => {
      setOrchestratedTasks((prev) =>
        prev.map((task) => {
          if (task.status !== 'in_progress') return task
          const updatedSubtasks = task.subtasks.map((st) => {
            if (st.progress >= 100) return { ...st, status: 'completed' as const }
            const next = Math.min(100, st.progress + Math.floor(Math.random() * 4))
            return {
              ...st,
              progress: next,
              status: next >= 100 ? ('completed' as const) : ('executing' as const),
            }
          })
          const allDone = updatedSubtasks.every((st) => st.progress >= 100)
          return {
            ...task,
            status: allDone ? 'completed' : 'in_progress',
            subtasks: updatedSubtasks,
          }
        })
      )
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const togglePodSelection = useCallback((podId: string) => {
    setSelectedPods((prev) => {
      if (prev.includes(podId)) {
        return prev.length > 1 ? prev.filter((id) => id !== podId) : prev
      }
      return [...prev, podId]
    })
  }, [])

  const selectedPriorityConfig = useMemo(
    () => PRIORITY_CARDS.find((p) => p.level === priority) || PRIORITY_CARDS[2],
    [priority]
  )

  const formatNowTimestamp = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    return `${hh}:${mm}:${ss}.${ms}`
  }

  const handleDispatchTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || selectedPods.length === 0) return

    setIsDispatching(true)
    setDispatchBanner(null)

    try {
      const created = await customApiService.createTask({
        title: title.trim(),
        description: objective.trim(),
        branch: branch.trim() || 'main',
        priority,
        priorityScore: selectedPriorityConfig.numericValue,
        executionMode,
        memoryScope,
        selectedPods,
      })

      const taskId = String(created?.id || Math.floor(1045 + Math.random() * 900))

      await Promise.all(
        selectedPods.map((podId) =>
          customApiService.assignTask(podId, {
            taskId,
            title: title.trim(),
            description: objective.trim(),
            branch: branch.trim() || 'main',
            priority: selectedPriorityConfig.numericValue,
            executionMode,
            memoryScope,
            selectedPods,
          })
        )
      )

      const newSubtasks: OrchestratedSubtask[] = selectedPods.map((podId, idx) => {
        const pod = SANDBOX_PODS.find((p) => p.id === podId)
        return {
          podId,
          podName: pod?.name || podId,
          label: `${executionMode}: ${title.trim().slice(0, 56)}`,
          progress: executionMode === 'Sequential Pipeline' && idx > 0 ? 12 : 34,
          status: executionMode === 'Sequential Pipeline' && idx > 0 ? 'queued' : 'executing',
        }
      })

      const newTaskItem: OrchestratedTaskItem = {
        id: taskId.replace(/^task-/, ''),
        title: title.trim(),
        objective: objective.trim(),
        branch: branch.trim() || 'main',
        priority,
        executionMode,
        memoryScope,
        assignedPods: [...selectedPods],
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        subtasks: newSubtasks,
      }

      setOrchestratedTasks((prev) => [newTaskItem, ...prev])

      const ts = formatNowTimestamp()
      const newLogs: TerminalLogEntry[] = [
        {
          id: `log-${Date.now()}-1`,
          timestamp: ts,
          podId: selectedPods[0],
          tag: 'DISPATCH',
          message: `Task #${newTaskItem.id} dispatched across ${selectedPods.join(', ')} [${executionMode}]`,
        },
        {
          id: `log-${Date.now()}-2`,
          timestamp: ts,
          podId: selectedPods[0],
          tag: 'CONNECT',
          message: `Memory scope bound: ${memoryScope} · Branch target: ${newTaskItem.branch}`,
        },
        {
          id: `log-${Date.now()}-3`,
          timestamp: ts,
          podId: selectedPods[selectedPods.length - 1],
          tag: 'STREAM',
          message: `Priority ${priority} (${selectedPriorityConfig.tokenConcurrency}) active on /api/ws/multi-agent`,
        },
      ]

      setTerminalLogs((prev) => [...prev, ...newLogs])
      setDispatchBanner(
        `Dispatched Task #${newTaskItem.id} to ${selectedPods.length} sandbox pod(s) in ${executionMode} mode.`
      )
      onTaskCreated?.(newTaskItem)
    } finally {
      setIsDispatching(false)
    }
  }

  const filteredLogs = useMemo(() => {
    if (activePodFilter === 'ALL') return terminalLogs
    return terminalLogs.filter((l) => l.podId === activePodFilter)
  }, [terminalLogs, activePodFilter])

  const getPodBadgeStyle = (status: PodStatus): React.CSSProperties => {
    if (status === 'ACTIVE') {
      return {
        color: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.14)',
        border: '1px solid rgba(52, 211, 153, 0.4)',
      }
    }
    if (status === 'READY') {
      return {
        color: '#29d3e6',
        backgroundColor: 'rgba(41, 211, 230, 0.14)',
        border: '1px solid rgba(41, 211, 230, 0.38)',
      }
    }
    return {
      color: 'var(--ff-text-secondary, #9fa9bc)',
      backgroundColor: 'rgba(159, 169, 188, 0.1)',
      border: '1px solid var(--ff-border, #232c3d)',
    }
  }

  return (
    <div
      className="fuze-flow06-wrap"
      data-frame="06-task-assignment-orchestration"
      style={
        {
          '--ff-bg-base': 'var(--bg-primary, #0f131c)',
          '--ff-bg-surface': 'var(--bg-secondary, #0b0e15)',
          '--ff-bg-elevated': 'var(--bg-tertiary, #141a26)',
          '--ff-border': 'var(--border-color, #232c3d)',
          '--ff-text-primary': 'var(--text-primary, #e7ecf5)',
          '--ff-text-secondary': 'var(--text-secondary, #9fa9bc)',
          '--ff-accent': 'var(--accent-color, #6e5cff)',
          backgroundColor: 'var(--ff-bg-base)',
          color: 'var(--ff-text-primary)',
          fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
        } as React.CSSProperties
      }
    >
      {/* Header Banner matching Frame 06 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '18px 22px',
          backgroundColor: 'var(--ff-bg-surface)',
          border: '1px solid var(--ff-border)',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, var(--ff-accent) 0%, #29d3e6 100%)',
          }}
        />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#29d3e6',
              marginBottom: '4px',
            }}
          >
            FuzeAgent Orchestrator v2 · Flow 06
          </div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              margin: 0,
              color: 'var(--ff-text-primary)',
            }}
          >
            Multi-Agent Task Assignment &amp; Orchestration
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--ff-text-secondary)',
              margin: '4px 0 0',
              maxWidth: '72ch',
            }}
          >
            Contract for assigning autonomous work tasks across deployed agent sandbox pods. Defines
            priority weighting, shared memory scopes, execution topology, and real-time step streaming.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#34d399',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#34d399',
                boxShadow: '0 0 6px #34d399',
              }}
            />
            {selectedPods.length} / {SANDBOX_PODS.length} Pods Selected
          </span>
        </div>
      </div>

      {dispatchBanner && (
        <div
          role="status"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(110, 92, 255, 0.14)',
            border: '1px solid var(--ff-accent)',
            color: 'var(--ff-text-primary)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚡ {dispatchBanner}</span>
          <button
            type="button"
            onClick={() => setDispatchBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ff-text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Two-Column Stage Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* LEFT PANEL: Task Assignment & Multi-Pod Dispatch Composer */}
        <div
          className="panel"
          data-assign-task-modal
          style={{
            backgroundColor: 'var(--ff-bg-surface)',
            border: '1px solid var(--ff-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--ff-border)',
              backgroundColor: 'var(--ff-bg-elevated)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                margin: 0,
                color: 'var(--ff-text-primary)',
              }}
            >
              Assign Workload Task
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '10px',
                color: '#29d3e6',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(41, 211, 230, 0.1)',
                border: '1px solid rgba(41, 211, 230, 0.25)',
              }}
            >
              Orchestrator v2
            </span>
          </div>

          <form onSubmit={handleDispatchTask} style={{ padding: '18px 20px' }}>
            {/* Multi-Agent Sandbox Pod Selector Pills */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Target Sandbox Pods (Multi-Select)
                </label>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '10px',
                    color: 'var(--ff-text-secondary)',
                  }}
                >
                  {selectedPods.length} active target(s)
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                {SANDBOX_PODS.map((pod) => {
                  const isSelected = selectedPods.includes(pod.id)
                  return (
                    <button
                      key={pod.id}
                      type="button"
                      data-pod-pill={pod.id}
                      onClick={() => togglePodSelection(pod.id)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '1px solid var(--ff-accent)'
                          : '1px solid var(--ff-border)',
                        backgroundColor: isSelected
                          ? 'rgba(110, 92, 255, 0.14)'
                          : 'var(--ff-bg-base)',
                        color: 'var(--ff-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isSelected ? '#fff' : 'var(--ff-text-primary)',
                          }}
                        >
                          {pod.id}
                        </span>
                        <span
                          style={{
                            ...getPodBadgeStyle(pod.status),
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '9999px',
                          }}
                        >
                          {pod.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--ff-text-primary)',
                        }}
                      >
                        {pod.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--ff-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {pod.agentInstance}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Lead Coordinator Agent Instance Selector (preserves data-select-agent contract) */}
              <div style={{ marginTop: '8px' }}>
                <label
                  htmlFor="target-agent"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  Lead Coordinator Instance
                </label>
                <select
                  id="target-agent"
                  data-select-agent
                  value={targetAgentSelect}
                  onChange={(e) => setTargetAgentSelect(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--ff-bg-base)',
                    border: '1px solid var(--ff-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: 'var(--ff-text-primary)',
                    fontSize: '12px',
                  }}
                >
                  <option value="fastapi-ml-agent-prod">
                    fastapi-ml-agent-prod (Python FastAPI &amp; ML Specialist)
                  </option>
                  <option value="k8s-sre-lead-01">
                    k8s-sre-lead-01 (Kubernetes Platform &amp; SRE Lead)
                  </option>
                  <option value="qa-regression-01">
                    qa-regression-01 (QA &amp; Test Automation Specialist)
                  </option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Title & Repository Branch Target */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <div>
                <label
                  htmlFor="task-title"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Task Objective Title *
                </label>
                <input
                  id="task-title"
                  data-input-task
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Run e2e API contract regression"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--ff-bg-base)',
                    border: '1px solid var(--ff-border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--ff-text-primary)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="task-branch"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Repo Branch Target
                </label>
                <input
                  id="task-branch"
                  data-input-branch
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--ff-bg-base)',
                    border: '1px solid var(--ff-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#29d3e6',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                  }}
                />
              </div>
            </div>

            {/* Priority Selector Cards with SLA & Token Concurrency */}
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ff-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Priority Tier &amp; Token Concurrency SLA
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px',
                }}
              >
                {PRIORITY_CARDS.map((card) => {
                  const isSelected = priority === card.level
                  return (
                    <button
                      key={card.level}
                      type="button"
                      data-priority={card.level.toLowerCase()}
                      onClick={() => setPriority(card.level)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isSelected
                          ? `1px solid ${card.accentColor}`
                          : '1px solid var(--ff-border)',
                        backgroundColor: isSelected ? card.bgTint : 'var(--ff-bg-base)',
                        color: 'var(--ff-text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isSelected ? card.accentColor : 'var(--ff-text-primary)',
                          }}
                        >
                          {card.level}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '10px',
                            color: 'var(--ff-text-secondary)',
                          }}
                        >
                          P{card.numericValue}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--ff-text-primary)' }}>
                        {card.sla}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '9px',
                          color: 'var(--ff-text-secondary)',
                          marginTop: '2px',
                        }}
                      >
                        {card.tokenConcurrency}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Execution Mode & Memory Scope Selectors */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <div>
                <label
                  htmlFor="execution-mode"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Execution Mode
                </label>
                <select
                  id="execution-mode"
                  data-select-execution-mode
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--ff-bg-base)',
                    border: '1px solid var(--ff-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: 'var(--ff-text-primary)',
                    fontSize: '12px',
                  }}
                >
                  {EXECUTION_MODES.map((m) => (
                    <option key={m.mode} value={m.mode}>
                      {m.mode} ({m.badge})
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--ff-text-secondary)',
                    marginTop: '4px',
                    lineHeight: 1.35,
                  }}
                >
                  {EXECUTION_MODES.find((m) => m.mode === executionMode)?.description}
                </div>
              </div>

              <div>
                <label
                  htmlFor="memory-scope"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ff-text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Shared Memory Scope
                </label>
                <select
                  id="memory-scope"
                  data-select-memory-scope
                  value={memoryScope}
                  onChange={(e) => setMemoryScope(e.target.value as MemoryScope)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--ff-bg-base)',
                    border: '1px solid var(--ff-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: 'var(--ff-text-primary)',
                    fontSize: '12px',
                  }}
                >
                  {MEMORY_SCOPES.map((ms) => (
                    <option key={ms.scope} value={ms.scope}>
                      {ms.scope} [{ms.tierTag}]
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--ff-text-secondary)',
                    marginTop: '4px',
                    lineHeight: 1.35,
                  }}
                >
                  {MEMORY_SCOPES.find((ms) => ms.scope === memoryScope)?.description}
                </div>
              </div>
            </div>

            {/* Detailed Execution Directives */}
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="task-details"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ff-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Detailed Execution Directives &amp; Prompt Contract
              </label>
              <textarea
                id="task-details"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--ff-bg-base)',
                  border: '1px solid var(--ff-border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--ff-text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans, sans-serif)',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              type="submit"
              data-action="dispatch-task"
              disabled={isDispatching}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, var(--ff-accent) 0%, #29d3e6 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isDispatching ? 'wait' : 'pointer',
                opacity: isDispatching ? 0.75 : 1,
                boxShadow: '0 8px 24px rgba(110, 92, 255, 0.35)',
              }}
            >
              {isDispatching
                ? 'Dispatching across Sandbox Pods...'
                : `Dispatch Task to ${selectedPods.length} Agent Pod${selectedPods.length > 1 ? 's' : ''}`}
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Live Orchestration Task Board + Streaming Execution Terminal */}
        <div
          className="panel"
          data-orchestration-canvas
          style={{
            backgroundColor: 'var(--ff-bg-surface)',
            border: '1px solid var(--ff-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--ff-border)',
              backgroundColor: 'var(--ff-bg-elevated)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                margin: 0,
                color: 'var(--ff-text-primary)',
              }}
            >
              Active Execution Stream &amp; Orchestration Board
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                color: '#34d399',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#34d399',
                  boxShadow: '0 0 6px #34d399',
                }}
              />
              3 Pods Ready
            </span>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Active Agent Pod Roster */}
            <div style={{ marginBottom: '16px' }}>
              {SANDBOX_PODS.map((pod) => {
                const isSelected = selectedPods.includes(pod.id)
                return (
                  <div
                    key={pod.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: isSelected
                          ? 'linear-gradient(90deg, var(--ff-accent) 0%, #29d3e6 100%)'
                          : 'var(--ff-bg-elevated)',
                        border: '1px solid var(--ff-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '11px',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {pod.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--ff-text-primary)',
                          }}
                        >
                          {pod.agentInstance}
                        </p>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '10px',
                            color: 'var(--ff-text-secondary)',
                          }}
                        >
                          ({pod.id})
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--ff-text-secondary)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        State: {pod.status} · {pod.currentTask}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '11px',
                        color: pod.status === 'ACTIVE' ? '#f5a623' : 'var(--ff-text-secondary)',
                      }}
                    >
                      {pod.stepProgress}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Live Orchestration Task Board with Subtask Progress Bars */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--ff-text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Active Multi-Agent Tasks ({mergedTasks.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mergedTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ff-bg-elevated)',
                      border: '1px solid var(--ff-border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '10px',
                            color: '#29d3e6',
                            marginRight: '6px',
                          }}
                        >
                          #{task.id}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--ff-text-primary)',
                          }}
                        >
                          {task.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            task.status === 'completed'
                              ? 'rgba(52, 211, 153, 0.14)'
                              : 'rgba(110, 92, 255, 0.16)',
                          color: task.status === 'completed' ? '#34d399' : '#29d3e6',
                          flexShrink: 0,
                        }}
                      >
                        {task.status.toUpperCase()}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--ff-text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      <span>Mode: {task.executionMode}</span>
                      <span>·</span>
                      <span>Scope: {task.memoryScope}</span>
                      <span>·</span>
                      <span>Branch: {task.branch}</span>
                    </div>

                    {/* Subtask Progress Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {task.subtasks.map((st) => (
                        <div key={`${task.id}-${st.podId}`}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono, monospace)',
                              marginBottom: '3px',
                            }}
                          >
                            <span style={{ color: 'var(--ff-text-primary)' }}>
                              [{st.podId}] {st.podName}
                            </span>
                            <span style={{ color: '#29d3e6' }}>{st.progress}%</span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '5px',
                              backgroundColor: 'var(--ff-bg-base)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${st.progress}%`,
                                height: '100%',
                                background:
                                  st.progress >= 100
                                    ? '#34d399'
                                    : 'linear-gradient(90deg, var(--ff-accent) 0%, #29d3e6 100%)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streaming Execution Terminal with per-pod filter */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--ff-text-secondary)',
                  }}
                >
                  Streaming Execution Terminal
                </span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['ALL', ...SANDBOX_PODS.map((p) => p.id)].map((filterId) => (
                    <button
                      key={filterId}
                      type="button"
                      onClick={() => setActivePodFilter(filterId)}
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border:
                          activePodFilter === filterId
                            ? '1px solid var(--ff-accent)'
                            : '1px solid var(--ff-border)',
                        backgroundColor:
                          activePodFilter === filterId
                            ? 'rgba(110, 92, 255, 0.2)'
                            : 'var(--ff-bg-base)',
                        color:
                          activePodFilter === filterId ? '#fff' : 'var(--ff-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {filterId}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="terminal-box"
                data-terminal-output
                style={{
                  backgroundColor: '#080a0e',
                  border: '1px solid var(--ff-border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '11px',
                  lineHeight: 1.65,
                  color: '#29d3e6',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {filteredLogs.map((entry) => (
                  <div key={entry.id} style={{ whiteSpace: 'pre-wrap' }}>
                    <span style={{ color: '#66718a' }}>[{entry.timestamp}]</span>{' '}
                    <span style={{ color: '#6e5cff', fontWeight: 600 }}>[{entry.podId}]</span>{' '}
                    <span style={{ color: '#34d399' }}>[{entry.tag}]</span>{' '}
                    <span style={{ color: '#29d3e6' }}>{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiAgentTaskOrchestration
