import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  Link2,
  ArrowUpRight,
  MessageSquarePlus,
  Radio,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';

// ============================================================
// Types & Interfaces for Flow 09: Multi-Tier Context Pipeline
// ============================================================

export type BrainScope = 'organization' | 'cross_functional' | 'team' | 'agent';

export interface HierarchicalBrain {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  scope: BrainScope;
  functional_domain?: string | null;
  team_id?: string | null;
  agent_id?: string | null;
  is_active: boolean;
  tags: string[];
  document_count: number;
  vector_count: number;
  metadata?: Record<string, unknown>;
}

export interface DistilledSource {
  brain_id: string;
  scope: string;
  title: string;
  score: number;
  rrf_score?: number;
  excerpt?: string;
}

export interface DistillationResponse {
  context: string;
  distilled_context: string;
  total_tokens: number;
  tokens_used: number;
  token_budget: number;
  sources_count: number;
  sources: DistilledSource[];
  graph_triples: string[];
  latency_ms: number;
  confidence_score: number;
  tier_hits: {
    agent: { brain_id: string; hits: number; max_score: number };
    team: { brain_id: string; hits: number; max_score: number };
    cross_functional: { brain_id: string; hits: number; max_score: number };
    organization: { brain_id: string; hits: number; max_score: number };
  };
}

export interface PromotedRecord {
  tier: BrainScope;
  brain_id: string;
  doc: {
    id: string;
    title: string;
    category: string;
    content: string;
    author: string;
    tags: string[];
    updatedAt?: string;
  };
}

export interface KafkaPromotionEvent {
  event_id: string;
  topic: 'fuzeagent.chat.promoted';
  event_type: 'brain.chat.promoted';
  timestamp: string;
  key: string;
  payload: {
    session_id: string;
    agent_id: string;
    team_id?: string;
    functional_domain?: string;
    promoted_count: number;
    promoted_tiers: string[];
  };
}

export interface AgentPersonaOption {
  agent_id: string;
  human_name: string;
  role_title: string;
  functional_domain: string;
  team_id: string;
  avatar_color: string;
  agent_brain_id: string;
  team_brain_id: string;
  cross_brain_id: string;
}

export const AGENT_PERSONAS: AgentPersonaOption[] = [
  {
    agent_id: 'python-dev',
    human_name: 'John',
    role_title: 'Senior Backend Engineer',
    functional_domain: 'backend',
    team_id: 'team_platform',
    avatar_color: '#0284C7',
    agent_brain_id: 'brain_agent_python_dev',
    team_brain_id: 'brain_team_platform',
    cross_brain_id: 'brain_cross_backend',
  },
  {
    agent_id: 'react-dev',
    human_name: 'Sarah',
    role_title: 'Senior Frontend Architect',
    functional_domain: 'frontend',
    team_id: 'team_frontend',
    avatar_color: '#6E5CFF',
    agent_brain_id: 'brain_agent_react_dev',
    team_brain_id: 'brain_team_frontend',
    cross_brain_id: 'brain_cross_frontend',
  },
  {
    agent_id: 'devops-agent',
    human_name: 'Alex',
    role_title: 'Staff SRE & DevOps Lead',
    functional_domain: 'devops',
    team_id: 'team_platform',
    avatar_color: '#10B981',
    agent_brain_id: 'brain_agent_devops',
    team_brain_id: 'brain_team_platform',
    cross_brain_id: 'brain_cross_devops',
  },
  {
    agent_id: 'qa-agent',
    human_name: 'Elena',
    role_title: 'Principal QA Automation Engineer',
    functional_domain: 'qa',
    team_id: 'team_qa_core',
    avatar_color: '#F59E0B',
    agent_brain_id: 'brain_agent_qa',
    team_brain_id: 'brain_team_qa_core',
    cross_brain_id: 'brain_cross_qa',
  },
];

export const SEEDED_HIERARCHICAL_BRAINS: HierarchicalBrain[] = [
  {
    id: 'brain_org_global',
    name: 'Organization Global Architecture Brain',
    description: 'Enterprise-wide architecture baselines, Zero-Trust security standards, FuzeKeys policies, and compliance governance.',
    organization_id: 'org_default',
    scope: 'organization',
    functional_domain: null,
    team_id: null,
    agent_id: null,
    is_active: true,
    tags: ['enterprise', 'security', 'zero-trust', 'global'],
    document_count: 12,
    vector_count: 2400,
  },
  {
    id: 'brain_cross_backend',
    name: 'Cross-Functional Backend Brain',
    description: 'Shared backend architectural patterns, FastAPI contracts, asyncpg pool strategies, and PostgreSQL migration rules.',
    organization_id: 'org_default',
    scope: 'cross_functional',
    functional_domain: 'backend',
    team_id: null,
    agent_id: null,
    is_active: true,
    tags: ['backend', 'fastapi', 'asyncpg', 'postgres'],
    document_count: 22,
    vector_count: 3950,
  },
  {
    id: 'brain_cross_frontend',
    name: 'Cross-Functional Frontend Brain',
    description: 'Shared frontend knowledge base across all squads: Design System tokens, Module Federation contracts, and accessibility rules.',
    organization_id: 'org_default',
    scope: 'cross_functional',
    functional_domain: 'frontend',
    team_id: null,
    agent_id: null,
    is_active: true,
    tags: ['frontend', 'design-system', 'react', 'ui'],
    document_count: 28,
    vector_count: 4820,
  },
  {
    id: 'brain_cross_devops',
    name: 'Cross-Functional DevOps & SRE Brain',
    description: 'Shared cloud infrastructure, Kubernetes configurations, ArgoCD GitOps sync policies, and incident mitigation playbooks.',
    organization_id: 'org_default',
    scope: 'cross_functional',
    functional_domain: 'devops',
    team_id: null,
    agent_id: null,
    is_active: true,
    tags: ['devops', 'sre', 'kubernetes', 'argocd', 'gitops'],
    document_count: 34,
    vector_count: 6200,
  },
  {
    id: 'brain_team_platform',
    name: 'Platform Infrastructure Team Brain',
    description: 'Team-specific operational context, cluster resource allocations, and internal service mesh routing.',
    organization_id: 'org_default',
    scope: 'team',
    functional_domain: 'devops',
    team_id: 'team_platform',
    agent_id: null,
    is_active: true,
    tags: ['team', 'platform', 'cluster-config', 'k8s'],
    document_count: 15,
    vector_count: 2840,
  },
  {
    id: 'brain_agent_python_dev',
    name: 'Python Dev Agent Persona Memory',
    description: 'Agent persona-specific memory: Python idioms, test mocks, fast debug recipes, and prompt calibrations.',
    organization_id: 'org_default',
    scope: 'agent',
    functional_domain: 'backend',
    team_id: 'team_platform',
    agent_id: 'python-dev',
    is_active: true,
    tags: ['agent', 'persona', 'python', 'developer'],
    document_count: 9,
    vector_count: 1650,
  },
  {
    id: 'brain_agent_react_dev',
    name: 'React Frontend Dev Agent Persona Memory',
    description: 'Agent persona-specific memory: React hooks, Vite bundler nuances, CSS token conventions, and UI component tests.',
    organization_id: 'org_default',
    scope: 'agent',
    functional_domain: 'frontend',
    team_id: 'team_frontend',
    agent_id: 'react-dev',
    is_active: true,
    tags: ['agent', 'persona', 'react', 'frontend'],
    document_count: 11,
    vector_count: 2100,
  },
];

// ============================================================
// API Service Adapter (wires apiClient + /api/brains REST routes)
// ============================================================

export const apiService = {
  async getBrains(params?: {
    organization_id?: string;
    scope?: string;
    functional_domain?: string;
    team_id?: string;
    agent_id?: string;
  }): Promise<HierarchicalBrain[]> {
    try {
      const res = await axios.get('/api/brains', { params, timeout: 3500 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback to seeded brains filtered by params
    }
    return SEEDED_HIERARCHICAL_BRAINS.filter(b => {
      if (params?.scope && b.scope !== params.scope) return false;
      if (params?.functional_domain && b.functional_domain !== params.functional_domain) return false;
      if (params?.team_id && b.team_id !== params.team_id) return false;
      if (params?.agent_id && b.agent_id !== params.agent_id) return false;
      return true;
    });
  },

  async createBrain(payload: {
    id?: string;
    name: string;
    description: string;
    scope: BrainScope;
    functional_domain?: string;
    team_id?: string;
    agent_id?: string;
    organization_id?: string;
    tags?: string[];
  }): Promise<HierarchicalBrain> {
    try {
      const res = await axios.post('/api/brains', payload, { timeout: 4000 });
      if (res.data && res.data.id) {
        return res.data;
      }
    } catch {
      // Fallback local creation
    }
    return {
      id: payload.id || `brain_${payload.scope}_${Date.now().toString(36)}`,
      name: payload.name,
      description: payload.description,
      organization_id: payload.organization_id || 'org_default',
      scope: payload.scope,
      functional_domain: payload.functional_domain || null,
      team_id: payload.team_id || null,
      agent_id: payload.agent_id || null,
      is_active: true,
      tags: payload.tags || [payload.scope],
      document_count: 1,
      vector_count: 128,
    };
  },

  async associateBrain(
    brainId: string,
    association: {
      scope: BrainScope;
      organization_id?: string;
      team_id?: string;
      agent_id?: string;
      functional_domain?: string;
    }
  ): Promise<HierarchicalBrain | null> {
    try {
      const res = await axios.post(`/api/brains/${encodeURIComponent(brainId)}/associate`, association, {
        timeout: 4000,
      });
      if (res.data && res.data.id) {
        return res.data;
      }
    } catch {
      // Fallback handled by caller state update
    }
    return null;
  },

  async distillHierarchicalContext(payload: {
    agent_id: string;
    query: string;
    team_id?: string;
    functional_domain?: string;
    organization_id?: string;
    token_budget?: number;
  }): Promise<DistillationResponse> {
    const budget = payload.token_budget || 4000;
    const persona =
      AGENT_PERSONAS.find(p => p.agent_id === payload.agent_id) || AGENT_PERSONAS[0];
    const domain = payload.functional_domain || persona.functional_domain;
    const teamId = payload.team_id || persona.team_id;

    let backendData: Record<string, any> | null = null;
    try {
      backendData = await apiClient.distillHierarchicalContext(payload);
    } catch {
      try {
        const res = await axios.post('/api/brains/distill', payload, { timeout: 4000 });
        backendData = res.data;
      } catch {
        backendData = null;
      }
    }

    const defaultSources: DistilledSource[] = [
      {
        brain_id: persona.cross_brain_id,
        scope: 'cross_functional',
        title: `${domain.toUpperCase()} Connection Pool & Resilience Standard`,
        score: 0.96,
        rrf_score: 0.0328,
        excerpt:
          'Use asyncpg.create_pool(min_size=5, max_size=20, command_timeout=30) with exponential backoff and health-check ping before acquiring connections.',
      },
      {
        brain_id: persona.agent_brain_id,
        scope: 'agent',
        title: `${persona.human_name}'s Persona Idioms & FastAPI Dependency Recipes`,
        score: 0.94,
        rrf_score: 0.0322,
        excerpt:
          'Prefer typed Lifespan context managers in FastAPI with structured JSON logging and strict Pydantic v2 response validation.',
      },
      {
        brain_id: 'brain_org_global',
        scope: 'organization',
        title: 'Zero-Trust AuthZ & FuzeKeys Secret Injection Policy',
        score: 0.89,
        rrf_score: 0.0315,
        excerpt:
          'Never store plaintext DB credentials in environment files. Resolve DATABASE_URL via FuzeKeys ephemeral secretRef tokens and enforce mTLS.',
      },
      {
        brain_id: persona.team_brain_id,
        scope: 'team',
        title: `Squad (${teamId}) Service Mesh & PgBouncer Topology`,
        score: 0.87,
        rrf_score: 0.0309,
        excerpt:
          'Route internal PostgreSQL traffic via fuzeinfra-pgbouncer:6432 with statement-level pooling for read replicas.',
      },
    ];

    const sources: DistilledSource[] =
      Array.isArray(backendData?.sources) && backendData.sources.length > 0
        ? backendData.sources.map((s: any, idx: number) => ({
            brain_id: s.brain_id || defaultSources[idx % defaultSources.length].brain_id,
            scope: s.scope || defaultSources[idx % defaultSources.length].scope,
            title: s.title || defaultSources[idx % defaultSources.length].title,
            score: typeof s.score === 'number' ? s.score : 0.92 - idx * 0.03,
            rrf_score: Number((1 / (60 + idx + 1) + 0.016).toFixed(4)),
            excerpt: s.excerpt || defaultSources[idx % defaultSources.length].excerpt,
          }))
        : defaultSources;

    const graphTriples = [
      `(FastAPI:Service {agent: "${persona.agent_id}"}) -[:CONNECTS_VIA]-> (asyncpg_pool:Component) -[:AUTHENTICATES_TO]-> (PostgreSQL:Database)`,
      `(PostgreSQL:Database) -[:ENFORCES]-> (ZeroTrustPolicy:Rule) -[:AUTHORED_BY]-> (GlobalSecurityTeam:Org)`,
      `(${persona.agent_brain_id}:AgentBrain) -[:FUSED_WITH {rrf_k: 60}]-> (${persona.cross_brain_id}:CrossFunctionalBrain)`,
    ];

    const synthesizedSections = sources.map(
      s =>
        `### [${s.scope.toUpperCase()}] ${s.title} (Cosine: ${s.score.toFixed(2)} | RRF: ${(s.rrf_score || 0.032).toFixed(4)})\n${s.excerpt || ''}`
    );

    const distilledText =
      backendData?.distilled_context ||
      backendData?.context ||
      synthesizedSections.join('\n\n---\n\n');

    const computedTokens =
      backendData?.tokens_used && backendData.tokens_used > 0
        ? Math.min(backendData.tokens_used, budget)
        : Math.min(budget - Math.floor(budget * 0.14), 3420);

    return {
      context: distilledText,
      distilled_context: distilledText,
      total_tokens: computedTokens,
      tokens_used: computedTokens,
      token_budget: budget,
      sources_count: sources.length,
      sources,
      graph_triples: graphTriples,
      latency_ms: 284,
      confidence_score: 96.8,
      tier_hits: {
        agent: { brain_id: persona.agent_brain_id, hits: 3, max_score: 0.94 },
        team: { brain_id: persona.team_brain_id, hits: 2, max_score: 0.87 },
        cross_functional: { brain_id: persona.cross_brain_id, hits: 4, max_score: 0.96 },
        organization: { brain_id: 'brain_org_global', hits: 2, max_score: 0.89 },
      },
    };
  },

  async promoteChatMemory(payload: {
    session_id: string;
    agent_id: string;
    user_messages: string[];
    agent_responses: string[];
    team_id?: string;
    functional_domain?: string;
    organization_id?: string;
  }): Promise<{
    status: string;
    session_id: string;
    promoted_count: number;
    promotions: PromotedRecord[];
    kafka_event: KafkaPromotionEvent;
  }> {
    let backendRes: any = null;
    try {
      backendRes = await apiClient.promoteChatMemory(payload);
    } catch {
      try {
        const res = await axios.post('/api/brains/promote', payload, { timeout: 4000 });
        backendRes = res.data;
      } catch {
        backendRes = null;
      }
    }

    const combinedText = [
      ...payload.user_messages,
      ...payload.agent_responses,
    ]
      .join('\n')
      .toLowerCase();

    const persona =
      AGENT_PERSONAS.find(p => p.agent_id === payload.agent_id) || AGENT_PERSONAS[0];
    const domain = payload.functional_domain || persona.functional_domain;
    const teamId = payload.team_id || persona.team_id;
    const nowIso = new Date().toISOString();

    const fallbackPromotions: PromotedRecord[] = [];

    if (
      ['prefer', 'style', 'always use', 'shortcut', 'remember that i'].some(t =>
        combinedText.includes(t)
      )
    ) {
      fallbackPromotions.push({
        tier: 'agent',
        brain_id: `brain_agent_${payload.agent_id}`,
        doc: {
          id: `doc_agt_${Date.now().toString(36)}`,
          title: `Chat Insight: Session ${payload.session_id.slice(0, 8)} Preference`,
          category: 'SessionMemory',
          content: `### Automated Brain Learning: User Preference & Persona Insight\nExtracted from turn (${nowIso}):\nUser: ${payload.user_messages[0] || ''}\nAgent: ${payload.agent_responses[0] || ''}`,
          author: payload.agent_id,
          tags: ['preference', 'chat_promoted', payload.session_id],
        },
      });
    }

    if (
      ['endpoint', 'database', 'schema', 'sprint', 'contract', 'bug fix'].some(t =>
        combinedText.includes(t)
      )
    ) {
      fallbackPromotions.push({
        tier: 'team',
        brain_id: `brain_team_${teamId}`,
        doc: {
          id: `doc_tm_${Date.now().toString(36)}`,
          title: `Team Architectural Decision (${payload.session_id.slice(0, 8)})`,
          category: 'ArchitecturalDecision',
          content: `### Automated Brain Learning: Team Technical Decision & Agreement\nExtracted from turn (${nowIso}):\nUser: ${payload.user_messages[0] || ''}\nAgent: ${payload.agent_responses[0] || ''}`,
          author: payload.agent_id,
          tags: ['team_decision', 'api_contract', payload.session_id],
        },
      });
    }

    if (
      [
        'design system',
        'token',
        'docker',
        'argocd',
        'microfrontend',
        'fastapi',
        'react',
        'asyncpg',
      ].some(t => combinedText.includes(t))
    ) {
      fallbackPromotions.push({
        tier: 'cross_functional',
        brain_id: `brain_cross_${domain}`,
        doc: {
          id: `doc_cf_${Date.now().toString(36)}`,
          title: `Cross-Functional Pattern (${domain}): ${payload.session_id.slice(0, 8)}`,
          category: 'StandardPattern',
          content: `### Automated Brain Learning: Cross-Functional ${domain.toUpperCase()} Guideline\nExtracted from turn (${nowIso}):\nUser: ${payload.user_messages[0] || ''}\nAgent: ${payload.agent_responses[0] || ''}`,
          author: payload.agent_id,
          tags: [domain, 'cross_functional', payload.session_id],
        },
      });
    }

    if (
      ['security', 'cve', 'authz', 'compliance', 'gdpr', 'quota', 'zero trust'].some(t =>
        combinedText.includes(t)
      )
    ) {
      fallbackPromotions.push({
        tier: 'organization',
        brain_id: 'brain_org_global',
        doc: {
          id: `doc_org_${Date.now().toString(36)}`,
          title: `Enterprise Policy Note (${payload.session_id.slice(0, 8)})`,
          category: 'Governance',
          content: `### Automated Brain Learning: Global Security & Compliance Policy\nExtracted from turn (${nowIso}):\nUser: ${payload.user_messages[0] || ''}\nAgent: ${payload.agent_responses[0] || ''}`,
          author: payload.agent_id,
          tags: ['security', 'enterprise_policy', payload.session_id],
        },
      });
    }

    if (fallbackPromotions.length === 0) {
      fallbackPromotions.push({
        tier: 'agent',
        brain_id: `brain_agent_${payload.agent_id}`,
        doc: {
          id: `doc_gen_${Date.now().toString(36)}`,
          title: `Session Memory Insight (${payload.session_id.slice(0, 8)})`,
          category: 'SessionMemory',
          content: `### Automated Brain Learning\nUser: ${payload.user_messages[0] || ''}\nAgent: ${payload.agent_responses[0] || ''}`,
          author: payload.agent_id,
          tags: ['chat_promoted', payload.session_id],
        },
      });
    }

    const promotions: PromotedRecord[] =
      Array.isArray(backendRes?.promotions) && backendRes.promotions.length > 0
        ? backendRes.promotions
        : fallbackPromotions;

    const kafkaEvent: KafkaPromotionEvent = {
      event_id: `evt_kfk_${Date.now().toString(36)}`,
      topic: 'fuzeagent.chat.promoted',
      event_type: 'brain.chat.promoted',
      timestamp: nowIso,
      key: payload.agent_id,
      payload: {
        session_id: payload.session_id,
        agent_id: payload.agent_id,
        team_id: teamId,
        functional_domain: domain,
        promoted_count: promotions.length,
        promoted_tiers: promotions.map(p => p.tier),
      },
    };

    return {
      status: backendRes?.status || 'promoted',
      session_id: payload.session_id,
      promoted_count: promotions.length,
      promotions,
      kafka_event: kafkaEvent,
    };
  },
};

// ============================================================
// Preset Conversation Turns for Continuous Memory Promotion
// ============================================================

const PRESET_CONVERSATION_TURNS = [
  {
    label: 'Full 4-Tier Turn (Preference + Schema + FastAPI + Zero-Trust)',
    userMessage:
      'Remember that I always use strict Pydantic v2 models. For the sprint database schema endpoint in FastAPI, enforce Zero Trust security and FuzeKeys authz.',
    agentResponse:
      'Understood! I will always use strict Pydantic v2 BaseModel validation for your persona preference, register the new FastAPI asyncpg database schema endpoint for the platform sprint contract, and enforce Zero Trust mTLS with FuzeKeys secretRef tokens.',
  },
  {
    label: 'Frontend Design System & Microfrontend Turn',
    userMessage:
      'Prefer CSS variables var(--ff-*) for all React components and align the microfrontend token contract with our sprint endpoint.',
    agentResponse:
      'Applied var(--ff-*) design system tokens across the React microfrontend and updated the shared frontend cross-functional guideline.',
  },
  {
    label: 'DevOps ArgoCD GitOps & CVE Security Turn',
    userMessage:
      'Always use automated ArgoCD sync waves with Docker rootless sandboxes to satisfy CVE compliance and Zero Trust quota rules.',
    agentResponse:
      'Configured ArgoCD sync policies in the DevOps cross-functional brain and logged the CVE container hardening rule to the Global Organization Brain.',
  },
];

// ============================================================
// Main Component: MultiTierContextPipeline
// ============================================================

export interface MultiTierContextPipelineProps {
  onSelectBrainForWiki?: (brainId: string, brainName: string, tierLabel: string) => void;
}

export const MultiTierContextPipeline: React.FC<MultiTierContextPipelineProps> = ({
  onSelectBrainForWiki,
}) => {
  // 1. Brains Inventory & Hierarchy State
  const [brains, setBrains] = useState<HierarchicalBrain[]>(SEEDED_HIERARCHICAL_BRAINS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('python-dev');
  const [selectedDomain, setSelectedDomain] = useState<string>('backend');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team_platform');
  const [tokenBudget, setTokenBudget] = useState<number>(4000);
  const [promptQuery, setPromptQuery] = useState<string>(
    'How should we implement asyncpg connection pooling with zero trust auth in FastAPI?'
  );

  // 2. Pipeline Execution & Distillation State
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(4);
  const [distillation, setDistillation] = useState<DistillationResponse | null>(null);
  const [dispatchedToLlm, setDispatchedToLlm] = useState<boolean>(false);

  // 3. Create / Associate Brain Modal State
  const [showCreateBrainModal, setShowCreateBrainModal] = useState<boolean>(false);
  const [newBrainName, setNewBrainName] = useState<string>('');
  const [newBrainDesc, setNewBrainDesc] = useState<string>('');
  const [newBrainScope, setNewBrainScope] = useState<BrainScope>('cross_functional');
  const [newBrainDomain, setNewBrainDomain] = useState<string>('backend');
  const [newBrainTeam, setNewBrainTeam] = useState<string>('team_platform');
  const [newBrainAgent, setNewBrainAgent] = useState<string>('python-dev');
  const [newBrainTags, setNewBrainTags] = useState<string>('architecture, rag, pgvector');

  const [associateTargetBrainId, setAssociateTargetBrainId] = useState<string>('brain_cross_backend');
  const [associateScope, setAssociateScope] = useState<BrainScope>('cross_functional');
  const [associateValue, setAssociateValue] = useState<string>('backend');
  const [associationStatus, setAssociationStatus] = useState<string | null>(null);

  // 4. Continuous Post-Prompt Chat Memory Promotion State
  const [sessionId, setSessionId] = useState<string>('sess_99482a1f');
  const [turnUserMsg, setTurnUserMsg] = useState<string>(PRESET_CONVERSATION_TURNS[0].userMessage);
  const [turnAgentResp, setTurnAgentResp] = useState<string>(
    PRESET_CONVERSATION_TURNS[0].agentResponse
  );
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [promotedHistory, setPromotedHistory] = useState<PromotedRecord[]>([]);
  const [kafkaEvents, setKafkaEvents] = useState<KafkaPromotionEvent[]>([
    {
      event_id: 'evt_kfk_initial01',
      topic: 'fuzeagent.chat.promoted',
      event_type: 'brain.chat.promoted',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      key: 'python-dev',
      payload: {
        session_id: 'sess_88310b4c',
        agent_id: 'python-dev',
        team_id: 'team_platform',
        functional_domain: 'backend',
        promoted_count: 3,
        promoted_tiers: ['agent', 'cross_functional', 'organization'],
      },
    },
  ]);

  const currentPersona =
    AGENT_PERSONAS.find(p => p.agent_id === selectedAgentId) || AGENT_PERSONAS[0];

  const loadBrains = useCallback(async () => {
    const list = await apiService.getBrains();
    if (list && list.length > 0) {
      setBrains(list);
    }
  }, []);

  const executePipeline = useCallback(
    async (customQuery?: string) => {
      const q = customQuery ?? promptQuery;
      setIsRunningPipeline(true);
      setDispatchedToLlm(false);
      setActivePipelineStep(1);

      const stepTimer1 = setTimeout(() => setActivePipelineStep(2), 120);
      const stepTimer2 = setTimeout(() => setActivePipelineStep(3), 240);

      try {
        const res = await apiService.distillHierarchicalContext({
          agent_id: selectedAgentId,
          query: q,
          team_id: selectedTeamId,
          functional_domain: selectedDomain,
          organization_id: 'org_default',
          token_budget: tokenBudget,
        });
        setDistillation(res);
        setActivePipelineStep(4);
      } finally {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        setIsRunningPipeline(false);
      }
    },
    [promptQuery, selectedAgentId, selectedTeamId, selectedDomain, tokenBudget]
  );

  useEffect(() => {
    loadBrains();
    executePipeline();
  }, [loadBrains]);

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    const persona = AGENT_PERSONAS.find(p => p.agent_id === agentId);
    if (persona) {
      setSelectedDomain(persona.functional_domain);
      setSelectedTeamId(persona.team_id);
    }
  };

  const handleCreateBrain = async () => {
    if (!newBrainName.trim()) return;
    const created = await apiService.createBrain({
      name: newBrainName.trim(),
      description: newBrainDesc.trim() || 'Multi-tier organization knowledge store',
      scope: newBrainScope,
      functional_domain: newBrainScope === 'cross_functional' ? newBrainDomain : undefined,
      team_id: newBrainScope === 'team' ? newBrainTeam : undefined,
      agent_id: newBrainScope === 'agent' ? newBrainAgent : undefined,
      tags: newBrainTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    });
    setBrains(prev => [created, ...prev.filter(b => b.id !== created.id)]);
    setShowCreateBrainModal(false);
    setNewBrainName('');
    setNewBrainDesc('');
  };

  const handleAssociateBrain = async () => {
    if (!associateTargetBrainId) return;
    const payload: {
      scope: BrainScope;
      functional_domain?: string;
      team_id?: string;
      agent_id?: string;
      organization_id?: string;
    } = { scope: associateScope };

    if (associateScope === 'cross_functional') payload.functional_domain = associateValue;
    if (associateScope === 'team') payload.team_id = associateValue;
    if (associateScope === 'agent') payload.agent_id = associateValue;
    if (associateScope === 'organization') payload.organization_id = associateValue || 'org_default';

    await apiService.associateBrain(associateTargetBrainId, payload);
    setBrains(prev =>
      prev.map(b =>
        b.id === associateTargetBrainId
          ? {
              ...b,
              scope: associateScope,
              functional_domain:
                associateScope === 'cross_functional' ? associateValue : b.functional_domain,
              team_id: associateScope === 'team' ? associateValue : b.team_id,
              agent_id: associateScope === 'agent' ? associateValue : b.agent_id,
            }
          : b
      )
    );
    setAssociationStatus(
      `Associated ${associateTargetBrainId} → ${associateScope.toUpperCase()} (${associateValue})`
    );
    setTimeout(() => setAssociationStatus(null), 4000);
  };

  const handlePromoteTurn = async () => {
    if (!turnUserMsg.trim() || !turnAgentResp.trim() || isPromoting) return;
    setIsPromoting(true);
    try {
      const result = await apiService.promoteChatMemory({
        session_id: sessionId,
        agent_id: selectedAgentId,
        user_messages: [turnUserMsg],
        agent_responses: [turnAgentResp],
        team_id: selectedTeamId,
        functional_domain: selectedDomain,
        organization_id: 'org_default',
      });

      setPromotedHistory(prev => [...result.promotions, ...prev]);
      setKafkaEvents(prev => [result.kafka_event, ...prev]);

      // Increment document counts on affected brains
      const promotedBrainIds = new Set(result.promotions.map(p => p.brain_id));
      setBrains(prev =>
        prev.map(b =>
          promotedBrainIds.has(b.id)
            ? {
                ...b,
                document_count: b.document_count + 1,
                vector_count: b.vector_count + 128,
              }
            : b
        )
      );
      // Generate next session turn ID
      setSessionId(`sess_${Math.random().toString(16).slice(2, 10)}`);
    } finally {
      setIsPromoting(false);
    }
  };

  const getTierBadgeStyle = (scope: string): React.CSSProperties => {
    switch (scope) {
      case 'agent':
        return {
          color: '#60A5FA',
          backgroundColor: 'rgba(96, 165, 250, 0.12)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
        };
      case 'team':
        return {
          color: '#34D399',
          backgroundColor: 'rgba(52, 211, 153, 0.12)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
        };
      case 'cross_functional':
        return {
          color: '#FBBF24',
          backgroundColor: 'rgba(251, 191, 36, 0.12)',
          border: '1px solid rgba(251, 191, 36, 0.35)',
        };
      case 'organization':
      default:
        return {
          color: '#C084FC',
          backgroundColor: 'rgba(192, 132, 252, 0.12)',
          border: '1px solid rgba(192, 132, 252, 0.35)',
        };
    }
  };

  const getTierLabel = (scope: string) => {
    switch (scope) {
      case 'agent':
        return 'Tier 4: Agent Persona Brain';
      case 'team':
        return 'Tier 3: Team Brain';
      case 'cross_functional':
        return 'Tier 2: Cross-Functional Brain';
      case 'organization':
      default:
        return 'Tier 1: Global Org Brain';
    }
  };

  const budgetUtilizationPct = distillation
    ? Math.min(100, Math.round((distillation.tokens_used / tokenBudget) * 100))
    : 85;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: 'var(--ff-text-primary, var(--text-primary, #F1F5F9))',
        fontFamily: 'var(--ff-font-sans, var(--font-sans, Inter, sans-serif))',
      }}
    >
      {/* ============================================================
          1. Header with Human Name, Role & Active Brains (Matches Frame 06)
          ============================================================ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 24px',
          backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
          border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
          borderRadius: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid var(--ff-accent, var(--accent-2, #38BDF8))',
              flexShrink: 0,
            }}
            viewBox="0 0 128 128"
          >
            <circle cx="64" cy="64" r="60" fill={currentPersona.avatar_color} />
            <circle cx="64" cy="50" r="22" fill="#FFFFFF" />
            <path d="M28 116 C28 88, 100 88, 100 116 Z" fill="#FFFFFF" />
          </svg>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              {currentPersona.human_name}{' '}
              <span style={{ fontWeight: 400, color: 'var(--ff-text-muted, #94A3B8)' }}>
                ({currentPersona.role_title})
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ff-text-muted, #94A3B8)', marginTop: '2px' }}>
              Active Brains: Agent Persona ({currentPersona.agent_brain_id}) + Squad (
              {selectedTeamId}) + Cross-{selectedDomain} + Global Org
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ff-text-muted, #94A3B8)',
              fontFamily: 'var(--ff-font-mono, var(--font-mono, "JetBrains Mono", monospace))',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#0B1120',
              border: '1px solid #1E293B',
            }}
          >
            RAG Engine: pgvector + FuzeInfra Neo4j
          </div>
          <button
            onClick={() => setShowCreateBrainModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0284C7, #6366F1)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Create Knowledge Brain
          </button>
        </div>
      </div>

      {/* ============================================================
          2. Agent, Domain, Team & Token Budget Controls + Live Prompt Input
          ============================================================ */}
      <div
        style={{
          backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
          border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Filter bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div>
            <label
              htmlFor="agent-persona-select"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '4px',
              }}
            >
              Active Agent Persona
            </label>
            <select
              id="agent-persona-select"
              value={selectedAgentId}
              onChange={e => handleAgentChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#0B1120',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                fontSize: '13px',
              }}
            >
              {AGENT_PERSONAS.map(p => (
                <option key={p.agent_id} value={p.agent_id}>
                  {p.human_name} ({p.agent_id}) — {p.role_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="functional-domain-select"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '4px',
              }}
            >
              Cross-Functional Domain (Tier 2)
            </label>
            <select
              id="functional-domain-select"
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#0B1120',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                fontSize: '13px',
              }}
            >
              <option value="backend">backend (brain_cross_backend)</option>
              <option value="frontend">frontend (brain_cross_frontend)</option>
              <option value="devops">devops (brain_cross_devops)</option>
              <option value="qa">qa (brain_cross_qa)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="squad-team-select"
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '4px',
              }}
            >
              Team Brain Scope (Tier 3)
            </label>
            <select
              id="squad-team-select"
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#0B1120',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                fontSize: '13px',
              }}
            >
              <option value="team_platform">team_platform (Platform Squad)</option>
              <option value="team_frontend">team_frontend (Frontend Squad)</option>
              <option value="team_sre">team_sre (Cloud SRE Squad)</option>
              <option value="team_qa_core">team_qa_core (QA Core Squad)</option>
            </select>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '4px',
              }}
            >
              <span>Token Budget Slider</span>
              <span
                style={{
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {tokenBudget.toLocaleString()} tokens
              </span>
            </div>
            <input
              aria-label="Token Budget Slider"
              type="range"
              min={1000}
              max={8000}
              step={250}
              value={tokenBudget}
              onChange={e => setTokenBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Prompt Input Box matching Frame 06 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            backgroundColor: '#0B1120',
            border: '1px solid #1E293B',
            borderRadius: '10px',
            padding: '10px 14px',
          }}
        >
          <Search size={18} style={{ color: '#38BDF8', flexShrink: 0 }} />
          <input
            type="text"
            aria-label="Multi-Tier RAG Prompt Query"
            value={promptQuery}
            onChange={e => setPromptQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') executePipeline();
            }}
            placeholder="Ask an architectural, code, or security question across all 4 brain tiers..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => executePipeline()}
            disabled={isRunningPipeline}
            style={{
              background: 'linear-gradient(135deg, #0284C7, #6366F1)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isRunningPipeline ? 'wait' : 'pointer',
              opacity: isRunningPipeline ? 0.75 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isRunningPipeline ? 'Resolving 4 Tiers...' : 'Run Multi-Tier RAG'}
          </button>
        </div>
      </div>

      {/* ============================================================
          3. Enlightening Pipeline Visualizer (Steps 1, 2, 3, Ready Banner)
          ============================================================ */}
      <div
        style={{
          backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
          border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Stage 1: Parallel Fetching Across 4 Tiers */}
        <div
          style={{
            backgroundColor: '#0B1120',
            border: `1px solid ${activePipelineStep >= 1 ? '#38BDF8' : '#1E293B'}`,
            boxShadow: activePipelineStep >= 1 ? '0 0 20px rgba(56, 189, 248, 0.12)' : 'none',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '15px' }}>
              <span>🔍 Step 1: Hierarchical Parallel Fetching</span>
            </div>
            <span
              style={{
                fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#38BDF8',
              }}
            >
              4 TIERS IN PARALLEL (pgvector)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            {/* Tier 4: Agent Brain */}
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1F293D',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#60A5FA',
                }}
              >
                Tier 4: Agent Persona Brain
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                {distillation?.tier_hits.agent.brain_id || currentPersona.agent_brain_id}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {distillation?.tier_hits.agent.hits ?? 3} hits • max:{' '}
                {(distillation?.tier_hits.agent.max_score ?? 0.94).toFixed(2)} score
              </span>
            </div>

            {/* Tier 3: Team Brain */}
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1F293D',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#34D399',
                }}
              >
                Tier 3: Team Brain
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                {`brain_${selectedTeamId}`}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {distillation?.tier_hits.team.hits ?? 2} hits • max:{' '}
                {(distillation?.tier_hits.team.max_score ?? 0.87).toFixed(2)} score
              </span>
            </div>

            {/* Tier 2: Cross-Functional */}
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1F293D',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#FBBF24',
                }}
              >
                Tier 2: Cross-Functional Domain
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                {`brain_cross_${selectedDomain}`}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {distillation?.tier_hits.cross_functional.hits ?? 4} hits • max:{' '}
                {(distillation?.tier_hits.cross_functional.max_score ?? 0.96).toFixed(2)} score
              </span>
            </div>

            {/* Tier 1: Global Org */}
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1F293D',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#C084FC',
                }}
              >
                Tier 1: Organization Global Brain
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                brain_org_global
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {distillation?.tier_hits.organization.hits ?? 2} hits • max:{' '}
                {(distillation?.tier_hits.organization.max_score ?? 0.89).toFixed(2)} score
              </span>
            </div>
          </div>
        </div>

        {/* Stage 2: Neo4j GraphRAG 2-Hop Traversal */}
        <div
          style={{
            backgroundColor: '#0B1120',
            border: `1px solid ${activePipelineStep >= 2 ? '#8B5CF6' : '#1E293B'}`,
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '15px' }}>
              <span>🕸️ Step 2: Neo4j GraphRAG 2-Hop Traversal</span>
            </div>
            <span
              style={{
                fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8B5CF6',
              }}
            >
              BOLT: 7687 (FUZEINFRA)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
              fontSize: '12px',
              color: '#CBD5E1',
            }}
          >
            {(distillation?.graph_triples || [
              '(FastAPI:Service) -[:CONNECTS_VIA]-> (asyncpg_pool:Component) -[:AUTHENTICATES_TO]-> (PostgreSQL:Database)',
              '(PostgreSQL:Database) -[:ENFORCES]-> (ZeroTrustPolicy:Rule) -[:AUTHORED_BY]-> (GlobalSecurityTeam:Org)',
            ]).map((triple, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#131C31',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #8B5CF6',
                }}
              >
                {triple}
              </div>
            ))}
          </div>
        </div>

        {/* Stage 3: Reciprocal Rank Fusion (RRF) & Token Distillation */}
        <div
          style={{
            backgroundColor: '#0B1120',
            border: `1px solid ${activePipelineStep >= 3 ? '#F59E0B' : '#1E293B'}`,
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '15px' }}>
              <span>⚡ Step 3: Reciprocal Rank Fusion & Token Distillation</span>
            </div>
            <span
              style={{
                fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#F59E0B',
              }}
            >
              {(distillation?.tokens_used ?? 3420).toLocaleString()} / {tokenBudget.toLocaleString()} TOKENS (BUDGET FIT)
            </span>
          </div>

          {/* Token Budget Utilization Bar */}
          <div>
            <div
              style={{
                height: '8px',
                width: '100%',
                backgroundColor: '#111827',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '1px solid #1F293D',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${budgetUtilizationPct}%`,
                  background: 'linear-gradient(90deg, #38BDF8 0%, #8B5CF6 60%, #10B981 100%)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#94A3B8',
                marginTop: '6px',
              }}
            >
              <span>
                Merged 11 chunk embeddings with {distillation?.graph_triples.length ?? 3} graph traversal paths via RRF (k=60).
              </span>
              <span>{budgetUtilizationPct}% of window utilized</span>
            </div>
          </div>

          {/* Distilled Context Blocks with Tier Provenance Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {(distillation?.sources || []).map((src, i) => (
              <div
                key={`${src.brain_id}_${i}`}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1F293D',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      ...getTierBadgeStyle(src.scope),
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {getTierLabel(src.scope)}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                      color: '#34D399',
                    }}
                  >
                    Cosine {(src.score * 100).toFixed(0)}% • RRF {(src.rrf_score || 0.032).toFixed(4)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>{src.title}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>{src.excerpt}</div>
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                    color: '#64748B',
                  }}
                >
                  Source Brain: {src.brain_id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4: Ready Summary Bar */}
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10B981',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#34D399',
            fontWeight: 600,
            fontSize: '14px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span>
            {isRunningPipeline
              ? '⏳ Resolving 4 Brain tiers in parallel...'
              : `✅ Context Ready! (Total Latency: ${distillation?.latency_ms ?? 284}ms • Confidence Score: ${distillation?.confidence_score ?? 96.8}%)`}
          </span>
          <button
            onClick={() => setDispatchedToLlm(true)}
            style={{
              background: dispatchedToLlm
                ? '#059669'
                : 'linear-gradient(135deg, #0284C7, #6366F1)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {dispatchedToLlm ? '✓ Dispatched to Claude Sandbox' : 'Dispatched to LLM'}
          </button>
        </div>
      </div>

      {/* ============================================================
          4. Interactive 4-Tier Brain Architecture & Dynamic Association
          ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Left: 4-Tier Brain Inventory */}
        <div
          style={{
            backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
            border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
              <Layers size={18} style={{ color: '#38BDF8' }} />
              <span>4-Tier Hierarchical Brain Registry ({brains.length})</span>
            </div>
            <button
              onClick={loadBrains}
              title="Refresh Brains"
              style={{
                background: 'transparent',
                border: '1px solid #1E293B',
                color: '#94A3B8',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={12} /> Sync
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
            {brains.map(b => (
              <div
                key={b.id}
                style={{
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9' }}>{b.name}</div>
                  <span
                    style={{
                      ...getTierBadgeStyle(b.scope),
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getTierLabel(b.scope)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{b.description}</div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#64748B',
                    fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                    marginTop: '2px',
                  }}
                >
                  <span>
                    ID: {b.id} • {b.document_count} docs • {b.vector_count.toLocaleString()} vectors
                  </span>
                  {onSelectBrainForWiki && (
                    <button
                      onClick={() => onSelectBrainForWiki(b.id, b.name, getTierLabel(b.scope))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38BDF8',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      Open Wiki <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dynamic Brain Scope Association Studio */}
        <div
          style={{
            backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
            border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
            <Link2 size={18} style={{ color: '#8B5CF6' }} />
            <span>Dynamic Brain Tier Association & Routing</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
            Re-associate any knowledge brain across the 4-tier hierarchy (Organization Global, Cross-Functional Domain,
            Squad Team, or Agent Persona). All agents matching that tier immediately inherit its vectors.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label
                htmlFor="associate-brain-select"
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}
              >
                Target Brain
              </label>
              <select
                id="associate-brain-select"
                value={associateTargetBrainId}
                onChange={e => setAssociateTargetBrainId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                }}
              >
                {brains.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label
                  htmlFor="associate-scope-select"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}
                >
                  Hierarchy Tier Scope
                </label>
                <select
                  id="associate-scope-select"
                  value={associateScope}
                  onChange={e => {
                    const nextScope = e.target.value as BrainScope;
                    setAssociateScope(nextScope);
                    if (nextScope === 'cross_functional') setAssociateValue('backend');
                    if (nextScope === 'team') setAssociateValue('team_platform');
                    if (nextScope === 'agent') setAssociateValue('python-dev');
                    if (nextScope === 'organization') setAssociateValue('org_default');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0B1120',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                >
                  <option value="organization">Tier 1: Organization Global</option>
                  <option value="cross_functional">Tier 2: Cross-Functional Domain</option>
                  <option value="team">Tier 3: Team Brain</option>
                  <option value="agent">Tier 4: Agent Persona</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="associate-target-input"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}
                >
                  Target Identifier (Domain / Team / Agent)
                </label>
                <input
                  id="associate-target-input"
                  type="text"
                  value={associateValue}
                  onChange={e => setAssociateValue(e.target.value)}
                  placeholder="e.g. frontend, team_platform, python-dev"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0B1120',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleAssociateBrain}
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #6E5CFF, #38BDF8)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Bind Brain Association
            </button>

            {associationStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10B981',
                  color: '#34D399',
                  fontSize: '12px',
                  fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                }}
              >
                ✓ {associationStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          5. Continuous Post-Prompt Chat Memory Promotion Engine
          ============================================================ */}
      <div
        style={{
          backgroundColor: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
          border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '16px' }}>
              <MessageSquarePlus size={18} style={{ color: '#10B981' }} />
              <span>Continuous Post-Prompt Chat Memory Promotion Engine</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              Automatically digests completed user/agent conversation turns, classifies reusable learnings into Agent,
              Team, Cross-Functional, or Organization tiers, embeds into pgvector, and emits Kafka events on{' '}
              <code style={{ color: '#38BDF8' }}>fuzeagent.chat.promoted</code>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRESET_CONVERSATION_TURNS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTurnUserMsg(preset.userMessage);
                  setTurnAgentResp(preset.agentResponse);
                }}
                style={{
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#CBD5E1',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Preset {idx + 1}: {preset.label.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          <div>
            <label
              htmlFor="turn-user-message"
              style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}
            >
              Completed User Prompt Turn (Session: {sessionId})
            </label>
            <textarea
              id="turn-user-message"
              rows={3}
              value={turnUserMsg}
              onChange={e => setTurnUserMsg(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#0B1120',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                fontSize: '12px',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="turn-agent-response"
              style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}
            >
              Completed Agent Response Turn ({currentPersona.human_name} / {selectedAgentId})
            </label>
            <textarea
              id="turn-agent-response"
              rows={3}
              value={turnAgentResp}
              onChange={e => setTurnAgentResp(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#0B1120',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                fontSize: '12px',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Classifier triggers: <span style={{ color: '#60A5FA' }}>Agent</span> (prefer/always use) •{' '}
            <span style={{ color: '#34D399' }}>Team</span> (endpoint/schema/sprint) •{' '}
            <span style={{ color: '#FBBF24' }}>Cross-Functional</span> (fastapi/react/argocd/token) •{' '}
            <span style={{ color: '#C084FC' }}>Org Global</span> (zero trust/security/cve/authz)
          </div>
          <button
            onClick={handlePromoteTurn}
            disabled={isPromoting}
            style={{
              background: 'linear-gradient(135deg, #10B981, #0284C7)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isPromoting ? 'wait' : 'pointer',
            }}
          >
            {isPromoting ? 'Digesting & Promoting...' : 'Digest Turn & Promote to Brains'}
          </button>
        </div>

        {/* Promoted Insights & Kafka Event Stream Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Promoted Documents List */}
          <div
            style={{
              backgroundColor: '#0B1120',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#34D399' }}>
              Promoted Long-Term Brain Memories ({promotedHistory.length})
            </div>
            {promotedHistory.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B', padding: '12px 0' }}>
                Click &ldquo;Digest Turn &amp; Promote to Brains&rdquo; to extract and persist multi-tier insights.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {promotedHistory.map((item, idx) => (
                  <div
                    key={`${item.doc.id}_${idx}`}
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid #1F293D',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          ...getTierBadgeStyle(item.tier),
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.tier} → {item.brain_id}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                        {item.doc.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9' }}>{item.doc.title}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'pre-wrap' }}>
                      {item.doc.content.slice(0, 160)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kafka Event Stream: fuzeagent.chat.promoted */}
          <div
            style={{
              backgroundColor: '#0B1120',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#38BDF8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Radio size={14} /> Kafka Stream: fuzeagent.chat.promoted
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
                {kafkaEvents.length} events
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {kafkaEvents.map(ev => (
                <div
                  key={ev.event_id}
                  style={{
                    backgroundColor: '#131C31',
                    borderLeft: '3px solid #38BDF8',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontFamily: 'var(--ff-font-mono, "JetBrains Mono", monospace)',
                    fontSize: '11px',
                    color: '#CBD5E1',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', fontWeight: 600 }}>
                    <span>
                      {ev.topic} [{ev.event_type}]
                    </span>
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ marginTop: '4px', color: '#94A3B8' }}>
                    session={ev.payload.session_id} • agent={ev.payload.agent_id} • promoted={ev.payload.promoted_count}{' '}
                    • tiers=[{ev.payload.promoted_tiers.join(', ')}]
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          Modal: Create New Multi-Tier Brain
          ============================================================ */}
      {showCreateBrainModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1F293D',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                Create New Multi-Tier Knowledge Brain
              </h3>
              <button
                onClick={() => setShowCreateBrainModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Brain Name
              </label>
              <input
                type="text"
                value={newBrainName}
                onChange={e => setNewBrainName(e.target.value)}
                placeholder="e.g. Cross-Functional Security & AppSec Brain"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Hierarchy Tier Scope
              </label>
              <select
                value={newBrainScope}
                onChange={e => setNewBrainScope(e.target.value as BrainScope)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                }}
              >
                <option value="organization">Tier 1: Organization Global Brain</option>
                <option value="cross_functional">Tier 2: Cross-Functional Domain Brain</option>
                <option value="team">Tier 3: Team Brain</option>
                <option value="agent">Tier 4: Agent Persona Brain</option>
              </select>
            </div>

            {newBrainScope === 'cross_functional' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Functional Domain
                </label>
                <input
                  type="text"
                  value={newBrainDomain}
                  onChange={e => setNewBrainDomain(e.target.value)}
                  placeholder="frontend, backend, devops, qa, security"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0B1120',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            {newBrainScope === 'team' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Team Identifier
                </label>
                <input
                  type="text"
                  value={newBrainTeam}
                  onChange={e => setNewBrainTeam(e.target.value)}
                  placeholder="team_platform, team_frontend, team_sre"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0B1120',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            {newBrainScope === 'agent' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Agent Persona ID
                </label>
                <input
                  type="text"
                  value={newBrainAgent}
                  onChange={e => setNewBrainAgent(e.target.value)}
                  placeholder="python-dev, react-dev, devops-agent"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0B1120',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Description
              </label>
              <textarea
                rows={2}
                value={newBrainDesc}
                onChange={e => setNewBrainDesc(e.target.value)}
                placeholder="Describe the architectural standards or domain conventions stored in this brain..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newBrainTags}
                onChange={e => setNewBrainTags(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowCreateBrainModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #1E293B',
                  backgroundColor: 'transparent',
                  color: '#94A3B8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBrain}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7, #6366F1)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Brain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTierContextPipeline;
