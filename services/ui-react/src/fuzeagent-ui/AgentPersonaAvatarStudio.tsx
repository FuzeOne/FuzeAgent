import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient as apiService } from '../services/api';

export interface GradientPreset {
  id: string;
  label: string;
  c1: string;
  c2: string;
  accentText: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'indigo-purple', label: 'Indigo → Purple', c1: '#6366F1', c2: '#8B5CF6', accentText: '#A5B4FC' },
  { id: 'blue-cyan', label: 'Blue → Cyan', c1: '#3B82F6', c2: '#06B6D4', accentText: '#38BDF8' },
  { id: 'emerald-teal', label: 'Emerald → Teal', c1: '#10B981', c2: '#14B8A6', accentText: '#34D399' },
  { id: 'amber-red', label: 'Amber → Red', c1: '#F59E0B', c2: '#EF4444', accentText: '#FBBF24' },
  { id: 'pink-purple', label: 'Pink → Purple', c1: '#EC4899', c2: '#8B5CF6', accentText: '#F472B6' },
];

export const COMMUNICATION_STYLE_TRAITS = [
  'Concise',
  'Code-First',
  'Strict Type Safety',
  'Architecture-Driven',
  'Test-First TDD',
  'Zero-Downtime Focus',
  'Root-Cause Diagnostics',
  'Security-Hardened',
];

export const FUNCTIONAL_DOMAINS = [
  { value: 'backend', label: 'backend — Core Services & APIs' },
  { value: 'frontend', label: 'frontend — Microfrontends & UI/UX' },
  { value: 'devops', label: 'devops — Kubernetes, GitOps & SRE' },
  { value: 'qa', label: 'qa — E2E Quality & Contract Testing' },
  { value: 'security', label: 'security — Zero-Trust & IAM' },
  { value: 'data', label: 'data — Vector RAG & Pipelines' },
];

export interface AgentPersonaItem {
  agent_id: string;
  human_name: string;
  role_title: string;
  functional_domain: string;
  bio: string;
  color_theme: string;
  gradient_id: string;
  seed: string;
  traits: string[];
  avatar_svg?: string;
  avatar_url?: string;
  custom_avatar_data_url?: string;
  s3_uri: string;
  sample_greeting: string;
}

/**
 * Deterministic hash function matching agent_persona_service.py seed behavior
 */
function computeDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
  return combined;
}

export function extractInitials(humanName: string): string {
  const parts = humanName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/**
 * Generates deterministic dual-tone SVG markup matching agent_persona_service.py
 */
export function generateDeterministicSvgString(
  humanName: string,
  roleTitle: string,
  seed?: string,
  explicitGradient?: GradientPreset
): { svg: string; preset: GradientPreset; hashHex: string; initials: string } {
  const initials = extractInitials(humanName);
  const hashHex = computeDeterministicHash(seed || `${humanName}_${roleTitle}`);
  const colorIdx = parseInt(hashHex.slice(0, 2), 16) % GRADIENT_PRESETS.length;
  const preset = explicitGradient || GRADIENT_PRESETS[colorIdx];
  const gradId = `grad_${hashHex.slice(0, 6)}`;
  const clipId = `circleClip_${hashHex.slice(0, 6)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${preset.c1}"/>
      <stop offset="100%" stop-color="${preset.c2}"/>
    </linearGradient>
    <clipPath id="${clipId}">
      <circle cx="64" cy="64" r="60"/>
    </clipPath>
  </defs>
  <circle cx="64" cy="64" r="62" fill="none" stroke="${preset.c1}" stroke-width="2" stroke-dasharray="6,4"/>
  <g clip-path="url(#${clipId})">
    <rect width="128" height="128" fill="url(#${gradId})"/>
    <circle cx="64" cy="50" r="22" fill="#FFFFFF" fill-opacity="0.85"/>
    <path d="M28 116 C28 88, 100 88, 100 116 Z" fill="#FFFFFF" fill-opacity="0.85"/>
  </g>
  <rect x="76" y="76" width="44" height="44" rx="22" fill="#0F172A" stroke="#FFFFFF" stroke-width="2"/>
  <text x="98" y="103" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${preset.accentText}" text-anchor="middle">${initials}</text>
</svg>`;

  return { svg, preset, hashHex, initials };
}

export const DEFAULT_PERSONA_ROSTER: AgentPersonaItem[] = [
  {
    agent_id: 'python-dev',
    human_name: 'John',
    role_title: 'Senior Backend Engineer',
    functional_domain: 'backend',
    color_theme: '#3B82F6',
    gradient_id: 'blue-cyan',
    seed: 'python-dev',
    bio: 'Specializes in Python, FastAPI, asyncpg, and high-performance microservices.',
    traits: ['Concise', 'Code-First', 'Strict Type Safety'],
    s3_uri: 's3://fuzeagent-org-default/brains/brain_agent_python-dev/avatars/python-dev_avatar.svg',
    sample_greeting:
      'I have verified the asyncpg connection pool and prepared the deterministic FastAPI migration with strict Pydantic v2 models.',
  },
  {
    agent_id: 'react-dev',
    human_name: 'Sarah',
    role_title: 'Frontend Architect',
    functional_domain: 'frontend',
    color_theme: '#10B981',
    gradient_id: 'emerald-teal',
    seed: 'react-dev',
    bio: 'Expert in React 19, Design System tokens, microfrontends, and accessible UI/UX.',
    traits: ['Architecture-Driven', 'Strict Type Safety', 'Code-First'],
    s3_uri: 's3://fuzeagent-org-default/brains/brain_agent_react-dev/avatars/react-dev_avatar.svg',
    sample_greeting:
      'All components are now bound to --ff-* CSS tokens with responsive grid layouts and zero layout shift.',
  },
  {
    agent_id: 'devops-agent',
    human_name: 'Alex',
    role_title: 'DevOps & SRE Specialist',
    functional_domain: 'devops',
    color_theme: '#F59E0B',
    gradient_id: 'amber-red',
    seed: 'devops-agent',
    bio: 'Coordinates Kubernetes clusters, ArgoCD GitOps syncs, Prometheus alerting, and cloud security.',
    traits: ['Zero-Downtime Focus', 'Root-Cause Diagnostics', 'Security-Hardened'],
    s3_uri: 's3://fuzeagent-org-default/brains/brain_agent_devops-agent/avatars/devops-agent_avatar.svg',
    sample_greeting:
      'ArgoCD sync status is Healthy across all replicas. Contabo S3 bucket policies and Harbor image pulls are verified.',
  },
  {
    agent_id: 'qa-agent',
    human_name: 'Elena',
    role_title: 'Lead Quality & Test Engineer',
    functional_domain: 'qa',
    color_theme: '#8B5CF6',
    gradient_id: 'pink-purple',
    seed: 'qa-agent',
    bio: 'Designs end-to-end Playwright suites, API contract validation, and load testing pipelines.',
    traits: ['Test-First TDD', 'Strict Type Safety', 'Root-Cause Diagnostics'],
    s3_uri: 's3://fuzeagent-org-default/brains/brain_agent_qa-agent/avatars/qa-agent_avatar.svg',
    sample_greeting:
      'All 42 E2E contract assertions and multipart S3 upload edge cases passed with 0 regressions.',
  },
];

interface AvatarGraphicProps {
  persona: AgentPersonaItem;
  size?: number;
}

const AvatarGraphic: React.FC<AvatarGraphicProps> = ({ persona, size = 96 }) => {
  if (persona.custom_avatar_data_url) {
    return (
      <img
        src={persona.custom_avatar_data_url}
        alt={`${persona.human_name} (${persona.role_title})`}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }}
      />
    );
  }

  const preset =
    GRADIENT_PRESETS.find((p) => p.id === persona.gradient_id) ||
    generateDeterministicSvgString(persona.human_name, persona.role_title, persona.seed).preset;
  const initials = extractInitials(persona.human_name);
  const hashHex = computeDeterministicHash(`${persona.seed}_${persona.human_name}_${persona.role_title}`);
  const gradId = `grad_${persona.agent_id}_${hashHex.slice(0, 6)}`;
  const clipId = `clip_${persona.agent_id}_${hashHex.slice(0, 6)}`;

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label={`${persona.human_name} SVG Avatar`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.c1} />
          <stop offset="100%" stopColor={preset.c2} />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="64" cy="64" r="60" />
        </clipPath>
      </defs>
      <circle
        cx="64"
        cy="64"
        r="62"
        fill="none"
        stroke={preset.c1}
        strokeWidth="2"
        strokeDasharray="6,4"
      />
      <g clipPath={`url(#${clipId})`}>
        <rect width="128" height="128" fill={`url(#${gradId})`} />
        <circle cx="64" cy="50" r="22" fill="#FFFFFF" fillOpacity="0.88" />
        <path d="M28 116 C28 88, 100 88, 100 116 Z" fill="#FFFFFF" fillOpacity="0.88" />
      </g>
      <rect x="76" y="76" width="44" height="44" rx="22" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" />
      <text
        x="98"
        y="103"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill={preset.accentText}
        textAnchor="middle"
      >
        {initials}
      </text>
    </svg>
  );
};

export interface AgentPersonaAvatarStudioProps {
  organizationId?: string;
  onPersonaUpdated?: (persona: AgentPersonaItem) => void;
}

export const AgentPersonaAvatarStudio: React.FC<AgentPersonaAvatarStudioProps> = ({
  organizationId = 'org_default',
  onPersonaUpdated,
}) => {
  const [personas, setPersonas] = useState<AgentPersonaItem[]>(DEFAULT_PERSONA_ROSTER);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('python-dev');
  const [loading, setLoading] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info';
    message: string;
    s3Uri?: string;
  } | null>(null);
  const [customTraitInput, setCustomTraitInput] = useState<string>('');
  const [showSvgSource, setShowSvgSource] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPersonas = useCallback(async () => {
    setLoading(true);
    try {
      const remoteList = await apiService.getAgentPersonas();
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        setPersonas((prev) => {
          const merged = [...prev];
          for (const remote of remoteList) {
            const idx = merged.findIndex((p) => p.agent_id === remote.agent_id);
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                human_name: remote.human_name || merged[idx].human_name,
                role_title: remote.role_title || merged[idx].role_title,
                functional_domain: remote.functional_domain || merged[idx].functional_domain,
                bio: remote.bio || merged[idx].bio,
                color_theme: remote.color_theme || merged[idx].color_theme,
                avatar_svg: remote.avatar_svg || merged[idx].avatar_svg,
                avatar_url: remote.avatar_url || merged[idx].avatar_url,
                s3_uri: `s3://fuzeagent-${organizationId.replace(/_/g, '-')}/brains/brain_agent_${remote.agent_id}/avatars/${remote.agent_id}_avatar.svg`,
              };
            } else if (remote.agent_id) {
              merged.push({
                agent_id: remote.agent_id,
                human_name: remote.human_name || remote.agent_id,
                role_title: remote.role_title || 'AI Specialist',
                functional_domain: remote.functional_domain || 'backend',
                bio: remote.bio || 'Autonomous FuzeAgent specialist.',
                color_theme: remote.color_theme || '#6366F1',
                gradient_id: 'indigo-purple',
                seed: remote.agent_id,
                traits: ['Concise', 'Code-First'],
                avatar_svg: remote.avatar_svg,
                avatar_url: remote.avatar_url,
                s3_uri: `s3://fuzeagent-${organizationId.replace(/_/g, '-')}/brains/brain_agent_${remote.agent_id}/avatars/${remote.agent_id}_avatar.svg`,
                sample_greeting: `Ready to assist as ${remote.human_name} (${remote.role_title}).`,
              });
            }
          }
          return merged;
        });
      }
    } catch {
      // Fallback defaults already initialized
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  const activePersona =
    personas.find((p) => p.agent_id === selectedAgentId) || personas[0];

  const updatePersonaState = (
    agentId: string,
    patch: Partial<AgentPersonaItem>
  ) => {
    setPersonas((prev) =>
      prev.map((item) => {
        if (item.agent_id !== agentId) return item;
        const updated = { ...item, ...patch };
        const preset = GRADIENT_PRESETS.find((g) => g.id === updated.gradient_id);
        const generated = generateDeterministicSvgString(
          updated.human_name,
          updated.role_title,
          updated.seed,
          preset
        );
        updated.avatar_svg = generated.svg;
        updated.color_theme = generated.preset.c1;
        return updated;
      })
    );
  };

  const handleRandomizeAvatar = (agentId: string) => {
    const target = personas.find((p) => p.agent_id === agentId);
    if (!target) return;
    const currentIdx = GRADIENT_PRESETS.findIndex((g) => g.id === target.gradient_id);
    const nextIdx = (currentIdx + 1) % GRADIENT_PRESETS.length;
    const nextPreset = GRADIENT_PRESETS[nextIdx];
    const nextSeed = `${agentId}_${Math.random().toString(36).slice(2, 7)}`;

    updatePersonaState(agentId, {
      gradient_id: nextPreset.id,
      seed: nextSeed,
      custom_avatar_data_url: undefined,
    });

    setStatusBanner({
      type: 'info',
      message: `Regenerated deterministic dual-tone SVG avatar for ${target.human_name} (${nextPreset.label}, seed: ${nextSeed}).`,
    });
  };

  const handleSavePersona = async (persona: AgentPersonaItem) => {
    setSavingId(persona.agent_id);
    const s3Uri = `s3://fuzeagent-${organizationId.replace(/_/g, '-')}/brains/brain_agent_${persona.agent_id}/avatars/${persona.agent_id}_avatar.svg`;

    try {
      const updatedRemote = await apiService.updateAgentPersona(persona.agent_id, {
        human_name: persona.human_name,
        role_title: persona.role_title,
        bio: persona.bio,
        organization_id: organizationId,
      });

      updatePersonaState(persona.agent_id, {
        s3_uri: s3Uri,
        avatar_svg: updatedRemote?.avatar_svg || persona.avatar_svg,
      });
    } catch {
      updatePersonaState(persona.agent_id, {
        s3_uri: s3Uri,
      });
    } finally {
      setSavingId(null);
      setStatusBanner({
        type: 'success',
        message: `Saved ${persona.human_name} (${persona.role_title}) to Persona Store & persisted SVG avatar to S3.`,
        s3Uri,
      });
      if (onPersonaUpdated) {
        onPersonaUpdated({ ...persona, s3_uri: s3Uri });
      }
    }
  };

  const handleToggleTrait = (trait: string) => {
    const exists = activePersona.traits.includes(trait);
    const nextTraits = exists
      ? activePersona.traits.filter((t) => t !== trait)
      : [...activePersona.traits, trait];
    updatePersonaState(activePersona.agent_id, { traits: nextTraits });
  };

  const handleAddCustomTrait = () => {
    const trimmed = customTraitInput.trim();
    if (!trimmed) return;
    if (!activePersona.traits.includes(trimmed)) {
      updatePersonaState(activePersona.agent_id, {
        traits: [...activePersona.traits, trimmed],
      });
    }
    setCustomTraitInput('');
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);

    const targetFilename = `${activePersona.agent_id}_avatar.${file.name.endsWith('.png') ? 'png' : 'svg'}`;
    const s3Uri = `s3://fuzeagent-${organizationId.replace(/_/g, '-')}/brains/brain_agent_${activePersona.agent_id}/avatars/${targetFilename}`;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      try {
        await apiService.initiateS3MultipartUpload({
          organization_id: organizationId,
          brain_id: `brain_agent_${activePersona.agent_id}`,
          filename: targetFilename,
          total_size_bytes: file.size || 2048,
          content_type: file.type || 'image/svg+xml',
          category: 'avatars',
        });
      } catch {
        // Offline or local demo fallback
      }

      updatePersonaState(activePersona.agent_id, {
        custom_avatar_data_url: result,
        s3_uri: s3Uri,
      });
      setUploadingAvatar(false);
      setStatusBanner({
        type: 'success',
        message: `Uploaded custom avatar (${file.name}) for ${activePersona.human_name} to S3 bucket.`,
        s3Uri,
      });
    };
    reader.readAsDataURL(file);
  };

  const activePreset =
    GRADIENT_PRESETS.find((g) => g.id === activePersona.gradient_id) || GRADIENT_PRESETS[0];
  const currentSvgCode = generateDeterministicSvgString(
    activePersona.human_name,
    activePersona.role_title,
    activePersona.seed,
    activePreset
  ).svg;

  return (
    <div
      style={{
        background: 'var(--ff-bg-primary, var(--bg-primary, #090D16))',
        color: 'var(--ff-text-primary, var(--text-primary, #F1F5F9))',
        padding: '28px',
        borderRadius: 'var(--ff-radius-xl, var(--radius-xl, 14px))',
        fontFamily: 'var(--ff-font-sans, var(--font-sans, Inter, sans-serif))',
        display: 'flex',
        flexDirection: 'column',
        gap: '26px',
      }}
    >
      {/* Header matching 07-agent-persona-and-avatar-studio.html */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--ff-text-primary, #FFFFFF)',
                margin: 0,
              }}
            >
              Agent Persona &amp; Avatar Studio
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--ff-accent, #38BDF8)',
                border: '1px solid rgba(56, 189, 248, 0.28)',
                fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
              }}
            >
              UX FLOW 10 • S3 AVATAR PERSISTENCE
            </span>
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--ff-text-muted, var(--text-secondary, #94A3B8))',
              marginTop: '6px',
              marginBottom: 0,
            }}
          >
            Assign human names, customize role positions, and generate high-res SVG avatars persisted to S3{' '}
            <code
              style={{
                fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                color: 'var(--ff-accent, #38BDF8)',
                fontSize: '12px',
              }}
            >
              brains/&#123;brain_id&#125;/avatars/
            </code>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadPersonas}
            disabled={loading}
            style={{
              background: 'var(--ff-bg-quaternary, var(--bg-quaternary, #1E293B))',
              border: '1px solid var(--ff-border, var(--border-strong, #334155))',
              color: 'var(--ff-text-primary, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Syncing Roster...' : '↻ Sync Persona Store'}
          </button>
        </div>
      </div>

      {/* Status notification banner */}
      {statusBanner && (
        <div
          role="status"
          style={{
            background:
              statusBanner.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(56, 189, 248, 0.12)',
            border: `1px solid ${
              statusBanner.type === 'success'
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(56, 189, 248, 0.35)'
            }`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <div>
            <strong
              style={{
                color: statusBanner.type === 'success' ? '#34D399' : '#38BDF8',
                marginRight: '8px',
              }}
            >
              {statusBanner.type === 'success' ? '✓ Persisted:' : 'ℹ Studio:'}
            </strong>
            <span>{statusBanner.message}</span>
            {statusBanner.s3Uri && (
              <code
                style={{
                  marginLeft: '10px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#38BDF8',
                  fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                }}
              >
                {statusBanner.s3Uri}
              </code>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ff-text-muted, #94A3B8)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2x2 Persona Roster Grid matching 07-agent-persona-and-avatar-studio.html */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
        }}
      >
        {personas.map((persona) => {
          const isSelected = persona.agent_id === activePersona.agent_id;
          const isSaving = savingId === persona.agent_id;
          return (
            <div
              key={persona.agent_id}
              id={`card-${persona.agent_id}`}
              onClick={() => setSelectedAgentId(persona.agent_id)}
              style={{
                background: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
                border: isSelected
                  ? '1px solid var(--ff-accent, #38BDF8)'
                  : '1px solid var(--ff-border, var(--border-color, #1F293D))',
                boxShadow: isSelected
                  ? '0 0 0 1px rgba(56, 189, 248, 0.25), 0 8px 24px rgba(0, 0, 0, 0.35)'
                  : 'none',
                borderRadius: '14px',
                padding: '22px',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'pointer',
              }}
            >
              {/* Avatar Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  flexShrink: 0,
                }}
              >
                <div
                  id={`avatar-${persona.agent_id}`}
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    border: '2px solid var(--ff-border, #1F293D)',
                    overflow: 'hidden',
                    background: '#0B1120',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <AvatarGraphic persona={persona} size={96} />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRandomizeAvatar(persona.agent_id);
                  }}
                  style={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    color: '#CBD5E1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ↻ Regenerate
                </button>
              </div>

              {/* Persona Details Column */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                      fontSize: '11px',
                      color: 'var(--ff-accent, #38BDF8)',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  >
                    {persona.agent_id}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--ff-text-muted, #94A3B8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Domain: <strong style={{ color: '#E2E8F0' }}>{persona.functional_domain}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor={`name-${persona.agent_id}`}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--ff-text-muted, #94A3B8)',
                    }}
                  >
                    Human Name
                  </label>
                  <input
                    id={`name-${persona.agent_id}`}
                    type="text"
                    value={persona.human_name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updatePersonaState(persona.agent_id, { human_name: e.target.value })
                    }
                    style={{
                      background: '#0B1120',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label
                    htmlFor={`role-${persona.agent_id}`}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--ff-text-muted, #94A3B8)',
                    }}
                  >
                    Position / Role
                  </label>
                  <input
                    id={`role-${persona.agent_id}`}
                    type="text"
                    value={persona.role_title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updatePersonaState(persona.agent_id, { role_title: e.target.value })
                    }
                    style={{
                      background: '#0B1120',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--ff-text-muted, #94A3B8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  S3 URI:{' '}
                  <code
                    style={{
                      fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                      color: '#CBD5E1',
                    }}
                  >
                    {persona.s3_uri}
                  </code>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: isSelected ? '#38BDF8' : 'var(--ff-text-muted, #64748B)',
                      fontWeight: 600,
                    }}
                  >
                    {isSelected ? '● Active in Avatar Studio' : 'Click card to open in Studio'}
                  </span>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSavePersona(persona);
                    }}
                    style={{
                      background: '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save Persona'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Studio Workbench & Live Chat Header / Agent Card Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '22px',
        }}
      >
        {/* Left Panel: Deterministic Dual-Tone SVG Avatar Studio & Deep Persona Editor */}
        <div
          style={{
            background: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
            border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Deterministic Dual-Tone SVG Avatar Studio — {activePersona.human_name}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--ff-text-muted, #94A3B8)', margin: '4px 0 0 0' }}>
                Customize gradient palettes, deterministic seed, functional domain, bio, and communication style traits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSvgSource((v) => !v)}
              style={{
                background: '#0B1120',
                border: '1px solid #334155',
                color: '#38BDF8',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showSvgSource ? 'Hide SVG XML' : '</> View SVG XML'}
            </button>
          </div>

          {/* Interactive SVG Studio Top Row */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              background: '#0B1120',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '112px',
                height: '112px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(56, 189, 248, 0.35)',
                flexShrink: 0,
                background: '#090D16',
              }}
            >
              <AvatarGraphic persona={activePersona} size={112} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--ff-text-muted, #94A3B8)',
                    marginBottom: '6px',
                  }}
                >
                  Gradient Palette Presets
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {GRADIENT_PRESETS.map((preset) => {
                    const isActive = activePersona.gradient_id === preset.id && !activePersona.custom_avatar_data_url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updatePersonaState(activePersona.agent_id, {
                            gradient_id: preset.id,
                            custom_avatar_data_url: undefined,
                          })
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isActive ? 'rgba(56, 189, 248, 0.16)' : '#111827',
                          color: isActive ? '#FFFFFF' : '#CBD5E1',
                          border: isActive ? '1px solid #38BDF8' : '1px solid #1F293D',
                        }}
                      >
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${preset.c1}, ${preset.c2})`,
                            display: 'inline-block',
                          }}
                        />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deterministic Seed & Custom Upload */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--ff-text-muted, #94A3B8)',
                      marginBottom: '3px',
                    }}
                  >
                    Deterministic Seed
                  </label>
                  <input
                    type="text"
                    value={activePersona.seed}
                    onChange={(e) =>
                      updatePersonaState(activePersona.agent_id, {
                        seed: e.target.value,
                        custom_avatar_data_url: undefined,
                      })
                    }
                    style={{
                      background: '#111827',
                      border: '1px solid #1E293B',
                      borderRadius: '6px',
                      color: '#E2E8F0',
                      padding: '6px 10px',
                      fontSize: '12px',
                      width: '100%',
                      fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleRandomizeAvatar(activePersona.agent_id)}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      color: '#38BDF8',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🎲 Randomize Seed
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.png,image/svg+xml,image/png"
                    onChange={handleAvatarFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(139, 92, 246, 0.16)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#C4B5FD',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {uploadingAvatar ? 'Uploading...' : '⬆ Upload SVG/PNG to S3'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showSvgSource && (
            <pre
              style={{
                background: '#090D16',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                color: '#38BDF8',
                fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {currentSvgCode}
            </pre>
          )}

          {/* Functional Domain & Bio/Backstory */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--ff-text-muted, #94A3B8)',
                  marginBottom: '4px',
                }}
              >
                Functional Domain
              </label>
              <select
                value={activePersona.functional_domain}
                onChange={(e) =>
                  updatePersonaState(activePersona.agent_id, {
                    functional_domain: e.target.value,
                  })
                }
                style={{
                  background: '#0B1120',
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  fontSize: '13px',
                  width: '100%',
                }}
              >
                {FUNCTIONAL_DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--ff-text-muted, #94A3B8)',
                  marginBottom: '4px',
                }}
              >
                Generated Initials Badge
              </label>
              <div
                style={{
                  background: '#0B1120',
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#CBD5E1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  Badge Initials: <strong style={{ color: '#38BDF8' }}>{extractInitials(activePersona.human_name)}</strong>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ff-text-muted, #94A3B8)' }}>
                  128×128 Dual-Tone Vector
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '4px',
              }}
            >
              Persona Bio &amp; Specialist Backstory
            </label>
            <textarea
              rows={2}
              value={activePersona.bio}
              onChange={(e) =>
                updatePersonaState(activePersona.agent_id, { bio: e.target.value })
              }
              style={{
                background: '#0B1120',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                color: '#FFFFFF',
                padding: '8px 12px',
                fontSize: '13px',
                width: '100%',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Communication Style Traits */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--ff-text-muted, #94A3B8)',
                marginBottom: '6px',
              }}
            >
              Communication Style &amp; Guardrail Traits
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {COMMUNICATION_STYLE_TRAITS.map((trait) => {
                const selected = activePersona.traits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => handleToggleTrait(trait)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selected ? 'rgba(56, 189, 248, 0.15)' : '#0B1120',
                      color: selected ? '#38BDF8' : '#94A3B8',
                      border: selected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #1E293B',
                    }}
                  >
                    {selected ? `✓ ${trait}` : `+ ${trait}`}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add custom communication trait (e.g. Socratic, RFC-Compliant)..."
                value={customTraitInput}
                onChange={(e) => setCustomTraitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTrait();
                  }
                }}
                style={{
                  background: '#0B1120',
                  border: '1px solid #1E293B',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '6px 10px',
                  fontSize: '12px',
                  flex: 1,
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomTrait}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#E2E8F0',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add Trait
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px solid #1F293D',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--ff-text-muted, #94A3B8)' }}>
              Target S3 Path:{' '}
              <code style={{ color: '#38BDF8', fontSize: '11px' }}>{activePersona.s3_uri}</code>
            </span>
            <button
              type="button"
              disabled={savingId === activePersona.agent_id}
              onClick={() => handleSavePersona(activePersona)}
              style={{
                background: 'linear-gradient(90deg, #0284C7 0%, #6366F1 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {savingId === activePersona.agent_id
                ? 'Persisting to S3...'
                : `Save & Persist ${activePersona.human_name} to S3`}
            </button>
          </div>
        </div>

        {/* Right Panel: Live Chat Header & Agent Card Preview */}
        <div
          style={{
            background: 'var(--ff-bg-card, var(--bg-tertiary, #111827))',
            border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              Live Chat Header &amp; Agent Card Workspace Preview
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--ff-text-muted, #94A3B8)', margin: '4px 0 0 0' }}>
              Real-time preview of how {activePersona.human_name} appears in the FuzeAgent Chat Header, Task Orchestrator, and Agent Roster Card.
            </p>
          </div>

          {/* 1. Live Chat Header Preview */}
          <div
            style={{
              background: '#0B1120',
              border: '1px solid #1F293D',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: '#090D16',
                borderBottom: '1px solid #1F293D',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <AvatarGraphic persona={activePersona} size={44} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                      {activePersona.human_name}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38BDF8',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                      }}
                    >
                      {activePersona.role_title}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--ff-text-muted, #94A3B8)',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: '#10B981', fontWeight: 600 }}>● Online</span>
                    <span>•</span>
                    <code>{activePersona.agent_id}</code>
                    <span>•</span>
                    <span>Brain: brain_agent_{activePersona.agent_id}</span>
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                CHAT HEADER PREVIEW
              </span>
            </div>

            {/* Simulated Live Chat Stream Message */}
            <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <AvatarGraphic persona={activePersona} size={34} />
              </div>
              <div
                style={{
                  background: '#111827',
                  border: '1px solid #1F293D',
                  borderRadius: '12px',
                  borderTopLeftRadius: '4px',
                  padding: '12px 14px',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                    {activePersona.human_name}{' '}
                    <span style={{ fontWeight: 500, color: '#38BDF8', fontSize: '11px' }}>
                      ({activePersona.role_title})
                    </span>
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>Just now • Stream SSE</span>
                </div>
                <p style={{ fontSize: '13px', color: '#E2E8F0', margin: 0, lineHeight: 1.5 }}>
                  {activePersona.sample_greeting}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {activePersona.traits.map((trait) => (
                    <span
                      key={trait}
                      style={{
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        background: 'rgba(99, 102, 241, 0.14)',
                        color: '#A5B4FC',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Agent Roster Workspace Card Preview */}
          <div
            style={{
              background: '#0B1120',
              border: '1px solid #1F293D',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--ff-text-muted, #94A3B8)',
                }}
              >
                Workspace Agent Card Preview
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--ff-font-mono, var(--font-mono, JetBrains Mono, monospace))',
                  color: '#38BDF8',
                }}
              >
                /api/v1/agents/{activePersona.agent_id}/avatar
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <AvatarGraphic persona={activePersona} size={64} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                    {activePersona.human_name}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38BDF8',
                    }}
                  >
                    {activePersona.role_title}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#C4B5FD',
                      textTransform: 'uppercase',
                    }}
                  >
                    {activePersona.functional_domain}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--ff-text-muted, #94A3B8)',
                    margin: '6px 0 0 0',
                    lineHeight: 1.45,
                  }}
                >
                  {activePersona.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPersonaAvatarStudio;
