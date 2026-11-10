import React, { useMemo, useCallback } from 'react'
import { FiClock, FiCheckCircle, FiAlertCircle, FiUser } from 'react-icons/fi'
import type { Task, Agent } from '../types'
import { MultiAgentTaskOrchestration } from '../fuzeagent-ui/MultiAgentTaskOrchestration'

export interface TasksViewProps {
  tasks?: Task[]
  agents?: Agent[]
  onTaskCreated?: (task: any) => void
}

const TasksView: React.FC<TasksViewProps> = React.memo(({ tasks = [], agents = [], onTaskCreated }) => {
  const getStatusBadgeStyle = useCallback((status: string): React.CSSProperties => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          backgroundColor: 'rgba(52, 211, 153, 0.14)',
          color: '#34d399',
          border: '1px solid rgba(52, 211, 153, 0.35)',
        }
      case 'in_progress':
        return {
          backgroundColor: 'rgba(41, 211, 230, 0.14)',
          color: '#29d3e6',
          border: '1px solid rgba(41, 211, 230, 0.35)',
        }
      case 'pending':
        return {
          backgroundColor: 'rgba(245, 166, 35, 0.14)',
          color: '#f5a623',
          border: '1px solid rgba(245, 166, 35, 0.35)',
        }
      case 'failed':
        return {
          backgroundColor: 'rgba(242, 107, 122, 0.14)',
          color: '#f26b7a',
          border: '1px solid rgba(242, 107, 122, 0.35)',
        }
      default:
        return {
          backgroundColor: 'var(--ff-bg-elevated, #141a26)',
          color: 'var(--ff-text-secondary, #9fa9bc)',
          border: '1px solid var(--ff-border, #232c3d)',
        }
    }
  }, [])

  const getStatusIcon = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <FiCheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />
      case 'in_progress':
        return (
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#29d3e6', borderTopColor: 'transparent' }}
          />
        )
      case 'pending':
        return <FiClock className="w-4 h-4" style={{ color: '#f5a623' }} />
      case 'failed':
        return <FiAlertCircle className="w-4 h-4" style={{ color: '#f26b7a' }} />
      default:
        return <FiClock className="w-4 h-4" />
    }
  }, [])

  const getPriorityColor = useCallback((priority: number) => {
    if (priority >= 8) return '#f26b7a'
    if (priority >= 6) return '#f5a623'
    if (priority >= 4) return '#29d3e6'
    return 'var(--ff-text-secondary, #9fa9bc)'
  }, [])

  const agentMap = useMemo(() => {
    return agents.reduce((map, agent) => {
      map[agent.id] = agent.name
      return map
    }, {} as Record<string, string>)
  }, [agents])

  const getAgentName = useCallback(
    (agentId: string) => {
      return agentMap[agentId] || 'fastapi-ml-agent-prod'
    },
    [agentMap]
  )

  const sortedTasks = useMemo(() => {
    return [...tasks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [tasks])

  return (
    <div
      style={
        {
          '--ff-bg-base': 'var(--bg-primary, #0f131c)',
          '--ff-bg-surface': 'var(--bg-secondary, #0b0e15)',
          '--ff-bg-elevated': 'var(--bg-tertiary, #141a26)',
          '--ff-border': 'var(--border-color, #232c3d)',
          '--ff-text-primary': 'var(--text-primary, #e7ecf5)',
          '--ff-text-secondary': 'var(--text-secondary, #9fa9bc)',
          '--ff-accent': 'var(--accent-color, #6e5cff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        } as React.CSSProperties
      }
    >
      {/* Flow 06 Multi-Agent Task Assignment & Orchestration Studio */}
      <MultiAgentTaskOrchestration
        tasks={tasks}
        agents={agents}
        onTaskCreated={onTaskCreated}
      />

      {/* Synchronized Squad Task Ledger when tasks prop is populated */}
      {sortedTasks.length > 0 && (
        <div
          className="panel"
          style={{
            backgroundColor: 'var(--ff-bg-surface)',
            border: '1px solid var(--ff-border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--ff-border)',
              backgroundColor: 'var(--ff-bg-elevated)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ff-text-primary)',
              }}
            >
              Squad Task Ledger ({sortedTasks.length})
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                color: 'var(--ff-text-secondary)',
              }}
            >
              Synced with Orchestrator
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--ff-border)',
                    backgroundColor: 'var(--ff-bg-base)',
                  }}
                >
                  <th
                    className="text-left py-3 px-4 font-medium"
                    style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                  >
                    Task
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium"
                    style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                  >
                    Status
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium"
                    style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                  >
                    Assigned To
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium"
                    style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                  >
                    Priority
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium"
                    style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task) => (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: '1px solid var(--ff-border)',
                      color: 'var(--ff-text-primary)',
                    }}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            margin: 0,
                            color: 'var(--ff-text-primary)',
                          }}
                        >
                          {task.title}
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--ff-text-secondary)',
                            margin: '2px 0 4px',
                          }}
                        >
                          {task.description}
                        </p>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono, monospace)',
                            backgroundColor: 'var(--ff-bg-elevated)',
                            color: 'var(--ff-text-secondary)',
                            borderRadius: '4px',
                            border: '1px solid var(--ff-border)',
                          }}
                        >
                          {(task.type || 'orchestration').replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span
                          style={{
                            ...getStatusBadgeStyle(task.status),
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                          }}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FiUser
                          className="w-4 h-4"
                          style={{ color: 'var(--ff-text-secondary)' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--ff-text-primary)' }}>
                          {task.assigned_agent_name || getAgentName(task.assigned_to)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: getPriorityColor(task.priority),
                        }}
                      >
                        P{task.priority}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4"
                      style={{ fontSize: '11px', color: 'var(--ff-text-secondary)' }}
                    >
                      {new Date(task.created_at).toLocaleDateString()}
                      <br />
                      <span style={{ fontSize: '10px', opacity: 0.75 }}>
                        {new Date(task.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

export default TasksView
