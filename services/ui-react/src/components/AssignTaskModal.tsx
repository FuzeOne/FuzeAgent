import React, { useState, useCallback, useMemo } from 'react'
import { FiX } from 'react-icons/fi'
import { Button } from '../design-system'
import {
  SANDBOX_PODS,
  PRIORITY_CARDS,
  EXECUTION_MODES,
  MEMORY_SCOPES,
  type PriorityLevel,
  type ExecutionMode,
  type MemoryScope,
  type PodStatus,
} from '../fuzeagent-ui/MultiAgentTaskOrchestration'

export interface AssignTaskModalProps {
  agentId: string
  agentName: string
  onClose: () => void
  onSubmit: (taskData: any) => Promise<void>
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  agentId,
  agentName,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'implement_feature',
    branch: 'main',
    priorityTier: 'HIGH' as PriorityLevel,
    executionMode: 'Parallel Fan-Out' as ExecutionMode,
    memoryScope: 'Tier 1-4 Full Hierarchy' as MemoryScope,
  })
  const [selectedPods, setSelectedPods] = useState<string[]>(['sbx-py-01', 'sbx-ui-04'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePod = useCallback((podId: string) => {
    setSelectedPods((prev) => {
      if (prev.includes(podId)) {
        return prev.length > 1 ? prev.filter((id) => id !== podId) : prev
      }
      return [...prev, podId]
    })
  }, [])

  const selectedPriorityCard = useMemo(
    () => PRIORITY_CARDS.find((c) => c.level === formData.priorityTier) || PRIORITY_CARDS[2],
    [formData.priorityTier]
  )

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        branch: formData.branch.trim() || 'main',
        priority: selectedPriorityCard.numericValue,
        priority_tier: formData.priorityTier,
        execution_mode: formData.executionMode,
        memory_scope: formData.memoryScope,
        selected_pods: selectedPods,
        agent_id: agentId,
        status: 'pending',
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      style={
        {
          '--ff-bg-base': 'var(--bg-primary, #0f131c)',
          '--ff-bg-surface': 'var(--bg-secondary, #0b0e15)',
          '--ff-bg-elevated': 'var(--bg-tertiary, #141a26)',
          '--ff-border': 'var(--border-color, #232c3d)',
          '--ff-text-primary': 'var(--text-primary, #e7ecf5)',
          '--ff-text-secondary': 'var(--text-secondary, #9fa9bc)',
          '--ff-accent': 'var(--accent-color, #6e5cff)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 99999,
        } as React.CSSProperties
      }
    >
      <div
        className="modal-dialog panel"
        data-assign-task-modal
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--ff-bg-surface)',
          borderColor: 'var(--ff-border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.78)',
          color: 'var(--ff-text-primary)',
        }}
      >
        <div
          className="p-5 border-b flex justify-between items-center"
          style={{
            borderColor: 'var(--ff-border)',
            backgroundColor: 'var(--ff-bg-elevated)',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '10px',
                color: '#29d3e6',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Multi-Agent Orchestrator v2
            </span>
            <h3
              className="text-base font-bold m-0"
              style={{ color: 'var(--ff-text-primary)' }}
            >
              Assign Task to {agentName || 'Agent Squad'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-colors"
            style={{ color: 'var(--ff-text-primary)' }}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 text-xs"
          style={{ maxHeight: '78vh', overflowY: 'auto' }}
        >
          {/* Multi-Agent Sandbox Pod Pills */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                className="block text-xs font-semibold"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Target Sandbox Pods (Multi-Pod Selection)
              </label>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '10px',
                  color: '#29d3e6',
                }}
              >
                {selectedPods.length} selected
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {SANDBOX_PODS.map((pod) => {
                const isSelected = selectedPods.includes(pod.id)
                return (
                  <button
                    key={pod.id}
                    type="button"
                    data-pod-pill={pod.id}
                    onClick={() => togglePod(pod.id)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '1px solid var(--ff-accent)'
                        : '1px solid var(--ff-border)',
                      backgroundColor: isSelected
                        ? 'rgba(110, 92, 255, 0.14)'
                        : 'var(--ff-bg-base)',
                      color: 'var(--ff-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '11px',
                          fontWeight: 700,
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
                    <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                      {pod.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Task Title & Repository Branch */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Task Title *
              </label>
              <input
                type="text"
                data-input-task
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Verify multi-agent websocket contract"
                className="w-full px-3 py-2 rounded-lg border outline-none"
                style={{
                  borderColor: 'var(--ff-border)',
                  backgroundColor: 'var(--ff-bg-base)',
                  color: 'var(--ff-text-primary)',
                }}
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Branch Target
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData((prev) => ({ ...prev, branch: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border outline-none"
                style={{
                  borderColor: 'var(--ff-border)',
                  backgroundColor: 'var(--ff-bg-base)',
                  color: '#29d3e6',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              />
            </div>
          </div>

          {/* Description / Directives */}
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Description &amp; Execution Directives *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border outline-none"
              style={{
                borderColor: 'var(--ff-border)',
                backgroundColor: 'var(--ff-bg-base)',
                color: 'var(--ff-text-primary)',
              }}
              required
            />
          </div>

          {/* Priority Cards (LOW, MEDIUM, HIGH, CRITICAL) */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Priority Tier &amp; SLA Concurrency
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {PRIORITY_CARDS.map((card) => {
                const isSelected = formData.priorityTier === card.level
                return (
                  <button
                    key={card.level}
                    type="button"
                    data-priority={card.level.toLowerCase()}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, priorityTier: card.level }))
                    }
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
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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
                    <div style={{ fontSize: '10px', marginTop: '2px' }}>{card.sla}</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '9px',
                        color: 'var(--ff-text-secondary)',
                      }}
                    >
                      {card.tokenConcurrency}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Task Type, Execution Mode & Memory Scope */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Task Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border outline-none"
                style={{
                  borderColor: 'var(--ff-border)',
                  backgroundColor: 'var(--ff-bg-elevated)',
                  color: 'var(--ff-text-primary)',
                }}
              >
                <option value="implement_feature">Implement Feature</option>
                <option value="fix_bug">Fix Bug</option>
                <option value="code_review">Code Review</option>
                <option value="refactor_code">Refactor Code</option>
                <option value="documentation">Documentation</option>
                <option value="testing">Testing</option>
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Execution Mode
              </label>
              <select
                value={formData.executionMode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    executionMode: e.target.value as ExecutionMode,
                  }))
                }
                className="w-full px-2.5 py-2 rounded-lg border outline-none"
                style={{
                  borderColor: 'var(--ff-border)',
                  backgroundColor: 'var(--ff-bg-elevated)',
                  color: 'var(--ff-text-primary)',
                }}
              >
                {EXECUTION_MODES.map((m) => (
                  <option key={m.mode} value={m.mode}>
                    {m.mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--ff-text-secondary)' }}
              >
                Memory Scope
              </label>
              <select
                value={formData.memoryScope}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    memoryScope: e.target.value as MemoryScope,
                  }))
                }
                className="w-full px-2.5 py-2 rounded-lg border outline-none"
                style={{
                  borderColor: 'var(--ff-border)',
                  backgroundColor: 'var(--ff-bg-elevated)',
                  color: 'var(--ff-text-primary)',
                }}
              >
                {MEMORY_SCOPES.map((ms) => (
                  <option key={ms.scope} value={ms.scope}>
                    {ms.scope}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="submit"
              variant="seam"
              size="md"
              loading={loading}
              data-action="dispatch-task"
              style={{ flex: 1 }}
            >
              Dispatch to {selectedPods.length} Pod{selectedPods.length > 1 ? 's' : ''}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssignTaskModal
