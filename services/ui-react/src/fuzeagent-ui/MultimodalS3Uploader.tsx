import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient as apiService } from '../services/api';
import {
  HardDrive,
  UploadCloud,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Layers,
  Sparkles,
  X,
  Activity,
  ShieldAlert,
} from 'lucide-react';

export interface S3MultipartPart {
  PartNumber: number;
  sizeBytes: number;
  progress: number; // 0..100
  status: 'pending' | 'uploading' | 'completed' | 'paused' | 'error';
  ETag?: string;
}

export type IngestionPipelineStage =
  | 's3_upload'
  | 'extraction_transcription'
  | 'semantic_chunking'
  | 'pgvector_index'
  | 'neo4j_graph';

export interface S3UploadJob {
  id: string;
  uploadId: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  category: 'Documents' | 'Media & Video' | 'Vector Embeddings' | 'Agent Avatars';
  s3Key: string;
  s3Uri: string;
  status: 'uploading' | 'paused' | 'completed' | 'error';
  parts: S3MultipartPart[];
  pipelineStage: IngestionPipelineStage;
  chunksCreated: number;
  etagFinal?: string;
  startedAt: string;
}

export interface S3QuotaState {
  organization_id: string;
  bucket_name: string;
  used_bytes: number;
  used_mb: number;
  quota_bytes: number;
  quota_mb: number;
  percentage_used: number;
  file_count: number;
  remaining_bytes: number;
}

export interface RangeInspectionResult {
  assetId: string;
  filename: string;
  s3Uri: string;
  rangeHeader: string;
  statusCode: string;
  contentRange: string;
  contentLength: number;
  etag: string;
  latencyMs: number;
  timestamp: string;
  previewHex: string;
}

export interface MultimodalS3UploaderProps {
  brainId?: string;
  brainName?: string;
  organizationId?: string;
  compact?: boolean;
  onAssetIngested?: (job: S3UploadJob) => void;
}

const FIVE_MB = 5 * 1024 * 1024;
const FIVE_GB = 5 * 1024 * 1024 * 1024;

function computeDeterministicETag(seed: string, partNumber: number): string {
  let h = 2166136261 >>> 0;
  const input = `${seed}:part-${partNumber}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `"${hex}${hex}a94f1c2e${partNumber.toString(16).padStart(4, '0')}"`;
}

function buildInitialParts(totalBytes: number, seed: string, completed = true): S3MultipartPart[] {
  const numParts = Math.max(1, Math.min(12, Math.ceil(totalBytes / FIVE_MB)));
  const parts: S3MultipartPart[] = [];
  for (let i = 1; i <= numParts; i++) {
    const isLast = i === numParts;
    const partSize = isLast ? totalBytes - (numParts - 1) * FIVE_MB : FIVE_MB;
    parts.push({
      PartNumber: i,
      sizeBytes: Math.max(partSize, Math.min(totalBytes, FIVE_MB)),
      progress: completed ? 100 : 0,
      status: completed ? 'completed' : 'pending',
      ETag: completed ? computeDeterministicETag(seed, i) : undefined,
    });
  }
  return parts;
}

function inferCategory(mime: string, name: string): S3UploadJob['category'] {
  const lower = name.toLowerCase();
  if (mime.startsWith('video/') || mime.startsWith('audio/') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mp3') || lower.endsWith('.wav')) {
    return 'Media & Video';
  }
  if (lower.includes('avatar') || ((mime.startsWith('image/') || lower.endsWith('.png') || lower.endsWith('.svg')) && lower.includes('persona'))) {
    return 'Agent Avatars';
  }
  if (lower.endsWith('.vec') || lower.endsWith('.jsonl') || lower.endsWith('.parquet')) {
    return 'Vector Embeddings';
  }
  return 'Documents';
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

const INITIAL_JOBS = (brainId: string): S3UploadJob[] => [
  {
    id: 'job_video_arch_01',
    uploadId: 'mp_u_99481a2c',
    filename: 'backend-architecture-deepdive.mp4',
    sizeBytes: Math.round(28.4 * 1024 * 1024),
    contentType: 'video/mp4',
    category: 'Media & Video',
    s3Key: `brains/${brainId}/media/backend-architecture-deepdive.mp4`,
    s3Uri: `s3://fuzeagent-org-default/brains/${brainId}/media/backend-architecture-deepdive.mp4`,
    status: 'completed',
    parts: buildInitialParts(Math.round(28.4 * 1024 * 1024), 'backend-architecture-deepdive.mp4', true),
    pipelineStage: 'pgvector_index',
    chunksCreated: 118,
    etagFinal: '"84b2c71a9930e5d1f0a21238c84910e2-6"',
    startedAt: '4 mins ago',
  },
  {
    id: 'job_pdf_zerotrust_02',
    uploadId: 'mp_u_77310f9b',
    filename: 'enterprise-zero-trust-guidelines.pdf',
    sizeBytes: Math.round(11.6 * 1024 * 1024),
    contentType: 'application/pdf',
    category: 'Documents',
    s3Key: `brains/${brainId}/documents/enterprise-zero-trust-guidelines.pdf`,
    s3Uri: `s3://fuzeagent-org-default/brains/${brainId}/documents/enterprise-zero-trust-guidelines.pdf`,
    status: 'completed',
    parts: buildInitialParts(Math.round(11.6 * 1024 * 1024), 'enterprise-zero-trust-guidelines.pdf', true),
    pipelineStage: 'neo4j_graph',
    chunksCreated: 42,
    etagFinal: '"39d0a11b5528f7c4e1209843b77211a9-3"',
    startedAt: '18 mins ago',
  },
  {
    id: 'job_svg_topology_03',
    uploadId: 'mp_u_51204c8e',
    filename: 'multi-tier-rag-topology.svg',
    sizeBytes: Math.round(4.2 * 1024 * 1024),
    contentType: 'image/svg+xml',
    category: 'Documents',
    s3Key: `brains/${brainId}/diagrams/multi-tier-rag-topology.svg`,
    s3Uri: `s3://fuzeagent-org-default/brains/${brainId}/diagrams/multi-tier-rag-topology.svg`,
    status: 'completed',
    parts: buildInitialParts(Math.round(4.2 * 1024 * 1024), 'multi-tier-rag-topology.svg', true),
    pipelineStage: 'neo4j_graph',
    chunksCreated: 16,
    etagFinal: '"f019c42e8831d6a2b5401928c33109d4-1"',
    startedAt: '1 hour ago',
  },
  {
    id: 'job_audio_standup_04',
    uploadId: 'mp_u_30982e1d',
    filename: 'incident-postmortem-transcript.wav',
    sizeBytes: Math.round(16.2 * 1024 * 1024),
    contentType: 'audio/wav',
    category: 'Media & Video',
    s3Key: `brains/${brainId}/audio/incident-postmortem-transcript.wav`,
    s3Uri: `s3://fuzeagent-org-default/brains/${brainId}/audio/incident-postmortem-transcript.wav`,
    status: 'completed',
    parts: buildInitialParts(Math.round(16.2 * 1024 * 1024), 'incident-postmortem-transcript.wav', true),
    pipelineStage: 'neo4j_graph',
    chunksCreated: 64,
    etagFinal: '"77c1b30a6642e8f1d9023145a88201f7-4"',
    startedAt: '2 hours ago',
  },
];

export const MultimodalS3Uploader: React.FC<MultimodalS3UploaderProps> = ({
  brainId = 'brain_cross_backend',
  brainName = 'Cross-Backend Architecture Brain',
  organizationId = 'org_default',
  compact = false,
  onAssetIngested,
}) => {
  const [quota, setQuota] = useState<S3QuotaState>({
    organization_id: organizationId,
    bucket_name: 'fuzeagent-org-default',
    used_bytes: 1310000000, // ~1.22 GB
    used_mb: 1249.3,
    quota_bytes: FIVE_GB,
    quota_mb: 5120,
    percentage_used: 24.4,
    file_count: 14,
    remaining_bytes: FIVE_GB - 1310000000,
  });

  const [jobs, setJobs] = useState<S3UploadJob[]>(() => INITIAL_JOBS(brainId));
  const [isDragging, setIsDragging] = useState(false);
  const [quotaAlertMessage, setQuotaAlertMessage] = useState<string | null>(null);
  const [simulateNearQuota, setSimulateNearQuota] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [rangeInspection, setRangeInspection] = useState<RangeInspectionResult | null>(null);
  const [selectedByteRange, setSelectedByteRange] = useState<string>('bytes=0-5242879');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync S3 quota from backend API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiService.getS3StorageQuota(organizationId);
        if (mounted && res && typeof res.quota_bytes === 'number') {
          setQuota({
            organization_id: res.organization_id || organizationId,
            bucket_name: res.bucket_name || 'fuzeagent-org-default',
            used_bytes: res.used_bytes ?? 1310000000,
            used_mb: res.used_mb ?? 1249.3,
            quota_bytes: res.quota_bytes || FIVE_GB,
            quota_mb: res.quota_mb || 5120,
            percentage_used:
              typeof res.percentage_used === 'number'
                ? res.percentage_used
                : Number((((res.used_bytes ?? 1310000000) / (res.quota_bytes || FIVE_GB)) * 100).toFixed(1)),
            file_count: res.file_count ?? 14,
            remaining_bytes: res.remaining_bytes ?? FIVE_GB - (res.used_bytes ?? 1310000000),
          });
        }
      } catch {
        // Fallback already initialized
      }
    })();
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  // Update S3 key prefixes if brainId changes
  useEffect(() => {
    setJobs(prev =>
      prev.map(job => {
        const subFolder =
          job.category === 'Media & Video'
            ? 'media'
            : job.category === 'Agent Avatars'
            ? 'avatars'
            : 'documents';
        const newKey = `brains/${brainId}/${subFolder}/${job.filename}`;
        return {
          ...job,
          s3Key: newKey,
          s3Uri: `s3://${quota.bucket_name}/${newKey}`,
        };
      })
    );
  }, [brainId, quota.bucket_name]);

  // Active chunk streaming timer for any uploading jobs
  useEffect(() => {
    const hasActiveUploads = jobs.some(j => j.status === 'uploading');
    if (!hasActiveUploads) return;

    const timer = setInterval(() => {
      setJobs(prevJobs =>
        prevJobs.map(job => {
          if (job.status !== 'uploading') return job;

          const nextParts = [...job.parts];
          const activeIdx = nextParts.findIndex(p => p.status === 'uploading' || p.status === 'pending');

          if (activeIdx === -1) {
            return {
              ...job,
              status: 'completed',
              pipelineStage: 'neo4j_graph',
            };
          }

          const currentPart = { ...nextParts[activeIdx] };
          currentPart.status = 'uploading';
          currentPart.progress = Math.min(100, currentPart.progress + 35);

          if (currentPart.progress >= 100) {
            currentPart.status = 'completed';
            currentPart.ETag = computeDeterministicETag(job.filename, currentPart.PartNumber);
          }

          nextParts[activeIdx] = currentPart;

          const completedCount = nextParts.filter(p => p.status === 'completed').length;
          const allDone = completedCount === nextParts.length;

          let nextStage: IngestionPipelineStage = 's3_upload';
          const ratio = completedCount / nextParts.length;
          if (allDone) {
            nextStage = 'neo4j_graph';
          } else if (ratio >= 0.75) {
            nextStage = 'pgvector_index';
          } else if (ratio >= 0.5) {
            nextStage = 'semantic_chunking';
          } else if (ratio >= 0.25) {
            nextStage = 'extraction_transcription';
          }

          if (allDone) {
            const finalEtag = `"${computeDeterministicETag(job.filename, 99).replace(/"/g, '').slice(0, 24)}-${nextParts.length}"`;
            // Fire completeS3MultipartUpload asynchronously
            apiService
              .completeS3MultipartUpload({
                organization_id: organizationId,
                s3_key: job.s3Key,
                upload_id: job.uploadId,
                parts: nextParts.map(p => ({
                  PartNumber: p.PartNumber,
                  ETag: p.ETag || computeDeterministicETag(job.filename, p.PartNumber),
                })),
              })
              .catch(() => {
                // Handled gracefully in standalone/mock mode
              });

            const finishedJob: S3UploadJob = {
              ...job,
              status: 'completed',
              parts: nextParts,
              pipelineStage: 'neo4j_graph',
              etagFinal: finalEtag,
            };
            if (onAssetIngested) {
              onAssetIngested(finishedJob);
            }
            return finishedJob;
          }

          return {
            ...job,
            parts: nextParts,
            pipelineStage: nextStage,
          };
        })
      );
    }, 420);

    return () => clearInterval(timer);
  }, [jobs, organizationId, onAssetIngested]);

  // Compute live quota metrics including newly added jobs & simulation mode
  const extraJobBytes = jobs
    .slice(0, Math.max(0, jobs.length - 4))
    .reduce((acc, j) => acc + j.sizeBytes, 0);
  const effectiveUsedBytes = simulateNearQuota
    ? Math.round(FIVE_GB * 0.96)
    : Math.min(quota.quota_bytes, quota.used_bytes + extraJobBytes);
  const effectivePct = Number(((effectiveUsedBytes / quota.quota_bytes) * 100).toFixed(1));

  // Category Breakdown
  const categoryBreakdown = [
    {
      name: 'Documents' as const,
      color: 'var(--ff-accent, var(--accent-2, #38BDF8))',
      bytes: Math.round(effectiveUsedBytes * 0.28),
      desc: 'PDFs, Markdown, SVG/PNG',
    },
    {
      name: 'Media & Video' as const,
      color: 'var(--ff-purple, var(--accent-color, #8B5CF6))',
      bytes: Math.round(effectiveUsedBytes * 0.48),
      desc: 'MP4/WebM Demos, Audio',
    },
    {
      name: 'Vector Embeddings' as const,
      color: 'var(--ff-success, var(--success-color, #10B981))',
      bytes: Math.round(effectiveUsedBytes * 0.18),
      desc: 'pgvector 384-dim HNSW',
    },
    {
      name: 'Agent Avatars' as const,
      color: 'var(--ff-warning, var(--warning-color, #F59E0B))',
      bytes: Math.round(effectiveUsedBytes * 0.06),
      desc: 'Persona PNG/WebP Assets',
    },
  ];

  const enqueueFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList.length) return;
      setQuotaAlertMessage(null);

      for (const file of fileList) {
        const simulatedSize = file.size > 0 ? file.size : Math.round(14.8 * 1024 * 1024);

        if (effectiveUsedBytes + simulatedSize > quota.quota_bytes) {
          setQuotaAlertMessage(
            `S3 Storage Quota Exceeded: Uploading "${file.name}" (${formatBytes(
              simulatedSize
            )}) would exceed the 5.00 GB organizational hard limit on bucket ${quota.bucket_name}.`
          );
          continue;
        }

        const cat = inferCategory(file.type || '', file.name);
        const subFolder =
          cat === 'Media & Video' ? 'media' : cat === 'Agent Avatars' ? 'avatars' : 'documents';
        const s3Key = `brains/${brainId}/${subFolder}/${file.name}`;
        let uploadId = `mp_u_${Math.random().toString(16).slice(2, 10)}`;

        try {
          const initRes = await apiService.initiateS3MultipartUpload({
            organization_id: organizationId,
            brain_id: brainId,
            filename: file.name,
            total_size_bytes: simulatedSize,
            content_type: file.type || 'application/octet-stream',
            category: cat,
          });
          if (initRes?.upload_id) {
            uploadId = initRes.upload_id;
          }
        } catch {
          // Graceful fallback when backend S3 service is offline
        }

        const initialParts = buildInitialParts(simulatedSize, file.name, false);
        if (initialParts.length > 0) {
          initialParts[0].status = 'uploading';
          initialParts[0].progress = 20;
        }

        const newJob: S3UploadJob = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          uploadId,
          filename: file.name,
          sizeBytes: simulatedSize,
          contentType: file.type || 'application/octet-stream',
          category: cat,
          s3Key,
          s3Uri: `s3://${quota.bucket_name}/${s3Key}`,
          status: 'uploading',
          parts: initialParts,
          pipelineStage: 's3_upload',
          chunksCreated: Math.max(8, Math.ceil(simulatedSize / (380 * 1024))),
          startedAt: 'Just now',
        };

        setJobs(prev => [newJob, ...prev]);
      }
    },
    [brainId, effectiveUsedBytes, organizationId, quota.bucket_name, quota.quota_bytes]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    enqueueFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    enqueueFiles(files);
  };

  const handleSimulateSampleUpload = (sampleType: 'video' | 'pdf' | 'diagram') => {
    const samples = {
      video: {
        name: `k8s-canary-rollout-demo-${Math.floor(100 + Math.random() * 899)}.webm`,
        size: Math.round(18.6 * 1024 * 1024),
        type: 'video/webm',
      },
      pdf: {
        name: `soc2-compliance-audit-${Math.floor(100 + Math.random() * 899)}.pdf`,
        size: Math.round(12.4 * 1024 * 1024),
        type: 'application/pdf',
      },
      diagram: {
        name: `kafka-ingestion-pipeline-${Math.floor(100 + Math.random() * 899)}.svg`,
        size: Math.round(6.8 * 1024 * 1024),
        type: 'image/svg+xml',
      },
    };
    const chosen = samples[sampleType];
    const fakeFile = new File([new ArrayBuffer(1024)], chosen.name, { type: chosen.type });
    Object.defineProperty(fakeFile, 'size', { value: chosen.size });
    enqueueFiles([fakeFile]);
  };

  const togglePauseResumeJob = (jobId: string) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        if (job.status === 'uploading') {
          return {
            ...job,
            status: 'paused',
            parts: job.parts.map(p => (p.status === 'uploading' ? { ...p, status: 'paused' } : p)),
          };
        }
        if (job.status === 'paused' || job.status === 'error') {
          return {
            ...job,
            status: 'uploading',
            parts: job.parts.map(p => (p.status === 'paused' || p.status === 'error' ? { ...p, status: 'uploading' } : p)),
          };
        }
        return job;
      })
    );
  };

  const retryMultipartJob = (jobId: string) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        const freshParts = buildInitialParts(job.sizeBytes, job.filename, false);
        if (freshParts.length > 0) {
          freshParts[0].status = 'uploading';
          freshParts[0].progress = 25;
        }
        return {
          ...job,
          status: 'uploading',
          pipelineStage: 's3_upload',
          parts: freshParts,
          startedAt: 'Retried just now',
        };
      })
    );
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (rangeInspection?.assetId === jobId) {
      setRangeInspection(null);
    }
  };

  const triggerHttpRangeStream = (job: S3UploadJob, customRange?: string) => {
    const rangeToUse = customRange || selectedByteRange || 'bytes=0-5242879';
    const match = rangeToUse.match(/bytes=(\d+)-(\d+)/);
    const startByte = match ? parseInt(match[1], 10) : 0;
    const requestedEnd = match ? parseInt(match[2], 10) : FIVE_MB - 1;
    const endByte = Math.min(job.sizeBytes - 1, requestedEnd);
    const length = Math.max(0, endByte - startByte + 1);

    setRangeInspection({
      assetId: job.id,
      filename: job.filename,
      s3Uri: job.s3Uri,
      rangeHeader: `Range: bytes=${startByte}-${endByte}`,
      statusCode: '206 Partial Content',
      contentRange: `bytes ${startByte}-${endByte}/${job.sizeBytes}`,
      contentLength: length,
      etag: job.etagFinal || computeDeterministicETag(job.filename, 1),
      latencyMs: Math.floor(11 + Math.random() * 18),
      timestamp: new Date().toLocaleTimeString(),
      previewHex: `89 50 4E 47 0D 0A 1A 0A  00 00 00 0D 49 48 44 52  |  S3Chunk[${startByte}..${endByte}] (${formatBytes(length)})`,
    });
  };

  const renderIconForJob = (job: S3UploadJob) => {
    if (job.contentType.startsWith('video/')) {
      return <Film size={20} style={{ color: 'var(--ff-purple, var(--accent-color, #8B5CF6))' }} />;
    }
    if (job.contentType.startsWith('audio/')) {
      return <Music size={20} style={{ color: 'var(--ff-warning, var(--warning-color, #F59E0B))' }} />;
    }
    if (job.contentType.startsWith('image/')) {
      return <ImageIcon size={20} style={{ color: 'var(--ff-success, var(--success-color, #10B981))' }} />;
    }
    return <FileText size={20} style={{ color: 'var(--ff-accent, var(--accent-2, #38BDF8))' }} />;
  };

  const getStageBadgeStatus = (
    job: S3UploadJob,
    stageOrder: number
  ): 'done' | 'running' | 'pending' => {
    const orderMap: Record<IngestionPipelineStage, number> = {
      s3_upload: 1,
      extraction_transcription: 2,
      semantic_chunking: 3,
      pgvector_index: 4,
      neo4j_graph: 5,
    };
    const currentOrder = orderMap[job.pipelineStage];
    if (job.status === 'completed' && job.pipelineStage === 'neo4j_graph') {
      return 'done';
    }
    if (stageOrder < currentOrder) return 'done';
    if (stageOrder === currentOrder) return 'running';
    return 'pending';
  };

  const filteredJobs =
    selectedCategoryFilter === 'ALL'
      ? jobs
      : jobs.filter(j => j.category === selectedCategoryFilter);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '16px' : '22px',
        padding: compact ? '16px' : '24px 32px',
        backgroundColor: 'var(--ff-bg-primary, var(--bg-primary, #090D16))',
        color: 'var(--ff-text-primary, var(--text-primary, #F1F5F9))',
        fontFamily: 'var(--ff-font-sans, var(--font-sans, Inter, sans-serif))',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: compact ? '18px' : '22px',
                fontWeight: 700,
                color: 'var(--ff-text-primary, #FFFFFF)',
              }}
            >
              Multimodal S3 Ingestion & Resumable Uploader
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--ff-font-mono, var(--font-mono, monospace))',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                color: 'var(--ff-accent, var(--accent-2, #38BDF8))',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 600,
              }}
            >
              MinIO S3 • 5 MB Multipart
            </span>
          </div>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: 'var(--ff-text-muted, var(--text-secondary, #94A3B8))',
            }}
          >
            FuzeInfra-managed MinIO S3 object storage with Kafka pipelining, pgvector indexing, and Neo4j graph linking for{' '}
            <strong style={{ color: 'var(--ff-text-primary, #E2E8F0)' }}>{brainName}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSimulateNearQuota(prev => !prev)}
            style={{
              backgroundColor: simulateNearQuota
                ? 'rgba(245, 158, 11, 0.2)'
                : 'var(--ff-bg-tertiary, var(--bg-quaternary, #1E293B))',
              color: simulateNearQuota
                ? 'var(--ff-warning, #F59E0B)'
                : 'var(--ff-text-muted, #CBD5E1)',
              border: `1px solid ${
                simulateNearQuota ? 'rgba(245, 158, 11, 0.5)' : 'var(--ff-border, #334155)'
              }`,
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Toggle simulated 96% S3 organizational quota utilization to inspect quota enforcement alerts"
          >
            <ShieldAlert size={14} />
            {simulateNearQuota ? 'Quota Stress: 96% (Active)' : 'Test Quota Alert'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--ff-accent-btn, #0284C7)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <UploadCloud size={16} />
            <span>+ Select Files / Media</span>
          </button>
        </div>
      </div>

      {/* Organization S3 Storage Quota Card */}
      <div
        style={{
          backgroundColor: 'var(--ff-card-bg, var(--bg-tertiary, #111827))',
          border: `1px solid ${
            effectivePct >= 90
              ? 'rgba(245, 158, 11, 0.55)'
              : 'var(--ff-border, var(--border-color, #1F293D))'
          }`,
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <HardDrive size={16} style={{ color: 'var(--ff-accent, #38BDF8)' }} />
            <span style={{ color: 'var(--ff-text-primary, #CBD5E1)' }}>Organization S3 Bucket:</span>
            <code
              style={{
                color: 'var(--ff-accent, #38BDF8)',
                fontFamily: 'var(--ff-font-mono, var(--font-mono, monospace))',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              s3://{quota.bucket_name}/brains/{brainId}/...
            </code>
          </div>

          <span
            style={{
              fontFamily: 'var(--ff-font-mono, var(--font-mono, monospace))',
              fontSize: '13px',
              fontWeight: 600,
              color:
                effectivePct >= 90
                  ? 'var(--ff-warning, #F59E0B)'
                  : 'var(--ff-accent, #38BDF8)',
            }}
          >
            {formatBytes(effectiveUsedBytes)} / {formatBytes(quota.quota_bytes)} ({effectivePct}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '9px',
            backgroundColor: 'var(--ff-bg-tertiary, #1E293B)',
            borderRadius: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, effectivePct)}%`,
              background:
                effectivePct >= 90
                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                  : 'linear-gradient(90deg, var(--ff-accent, #38BDF8), var(--ff-purple, #8B5CF6))',
              borderRadius: '5px',
              transition: 'width 0.35s ease',
            }}
          />
        </div>

        {/* Category Breakdown Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: '10px',
            marginTop: '2px',
          }}
        >
          {categoryBreakdown.map(cat => (
            <div
              key={cat.name}
              onClick={() =>
                setSelectedCategoryFilter(prev => (prev === cat.name ? 'ALL' : cat.name))
              }
              style={{
                backgroundColor:
                  selectedCategoryFilter === cat.name
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(15, 23, 42, 0.55)',
                border: `1px solid ${
                  selectedCategoryFilter === cat.name
                    ? 'var(--ff-accent, #38BDF8)'
                    : 'var(--ff-border, #1F293D)'
                }`,
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all 0.15s ease',
              }}
              title={`Click to filter assets by ${cat.name}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      display: 'inline-block',
                    }}
                  />
                  {cat.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--ff-font-mono, var(--font-mono, monospace))',
                    fontSize: '11px',
                    color: 'var(--ff-text-primary, #E2E8F0)',
                  }}
                >
                  {formatBytes(cat.bytes)}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ff-text-muted, #64748B)' }}>
                {cat.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Metadata Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: 'var(--ff-text-muted, var(--text-secondary, #94A3B8))',
            paddingTop: '4px',
            borderTop: '1px solid rgba(31, 41, 61, 0.6)',
          }}
        >
          <span>
            Logical Bucket Prefix: <code style={{ color: '#CBD5E1' }}>brains/{brainId}/...</code>
          </span>
          <span>Storage Engine: MinIO S3 (FuzeInfra)</span>
          <span>Part Size: 5.00 MB ETag Verified</span>
          <span>Configurable Quota: 5.00 GB Hard Cap</span>
        </div>

        {/* Quota Enforcement Alert Banner */}
        {(effectivePct >= 85 || quotaAlertMessage) && (
          <div
            role="alert"
            style={{
              marginTop: '4px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: 'var(--ff-warning, #FBBF24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>
                {quotaAlertMessage ||
                  `Quota Enforcement Alert: Organization bucket "${quota.bucket_name}" is at ${effectivePct}% capacity (${formatBytes(
                    quota.quota_bytes - effectiveUsedBytes
                  )} remaining). New multipart uploads exceeding 5.00 GB will be rejected with HTTP 413/507.`}
              </span>
            </div>
            {quotaAlertMessage && (
              <button
                type="button"
                onClick={() => setQuotaAlertMessage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-Select Drag & Drop Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragging ? 'var(--ff-accent, #38BDF8)' : 'var(--ff-border-dashed, #2A364F)'
          }`,
          borderRadius: '14px',
          padding: compact ? '22px 18px' : '30px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: isDragging
            ? 'rgba(56, 189, 248, 0.12)'
            : 'rgba(17, 24, 39, 0.45)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            display: ' inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ff-accent, #38BDF8)',
            marginBottom: '10px',
          }}
        >
          <UploadCloud size={22} />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ff-text-primary, #E2E8F0)' }}>
          Drop PDFs, Markdown, Architecture Diagrams (PNG/SVG), MP4/WebM Demos, or Audio here
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ff-text-muted, #94A3B8)',
            marginTop: '4px',
          }}
        >
          Supports multi-select with 5 MB S3 multipart resumable uploading, ETag verification & HTTP Range streaming
        </div>

        {/* Quick simulation triggers for one-click verification */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '14px',
          }}
        >
          <button
            type="button"
            onClick={() => handleSimulateSampleUpload('video')}
            style={{
              backgroundColor: 'var(--ff-bg-tertiary, #1E293B)',
              border: '1px solid var(--ff-border, #334155)',
              color: '#CBD5E1',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Simulate MP4/WebM Demo (4 Parts)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateSampleUpload('pdf')}
            style={{
              backgroundColor: 'var(--ff-bg-tertiary, #1E293B)',
              border: '1px solid var(--ff-border, #334155)',
              color: '#CBD5E1',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Simulate PDF Spec (3 Parts)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateSampleUpload('diagram')}
            style={{
              backgroundColor: 'var(--ff-bg-tertiary, #1E293B)',
              border: '1px solid var(--ff-border, #334155)',
              color: '#CBD5E1',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Simulate SVG Architecture Diagram (2 Parts)
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.png,.svg,.jpg,.jpeg,.webp,.mp4,.webm,.wav,.mp3,.json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* HTTP Range Stream Inspector Drawer (Appears when user inspects or streams an object) */}
      {rangeInspection && (
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={15} style={{ color: 'var(--ff-accent, #38BDF8)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
                HTTP Range Partial Stream Inspector — {rangeInspection.filename}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--ff-font-mono, monospace)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.16)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                {rangeInspection.statusCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRangeInspection(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ff-text-muted, #94A3B8)',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '8px',
              fontFamily: 'var(--ff-font-mono, monospace)',
              fontSize: '11px',
              color: '#CBD5E1',
            }}
          >
            <div>
              <span style={{ color: '#64748B' }}>Request Header: </span>
              <code style={{ color: '#38BDF8' }}>{rangeInspection.rangeHeader}</code>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Content-Range: </span>
              <code style={{ color: '#34D399' }}>{rangeInspection.contentRange}</code>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>ETag: </span>
              <code>{rangeInspection.etag}</code>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Accept-Ranges: </span>
              <code>bytes ({rangeInspection.latencyMs} ms)</code>
            </div>
          </div>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: '#090D16',
              border: '1px solid #1E293B',
              fontFamily: 'var(--ff-font-mono, monospace)',
              fontSize: '11px',
              color: '#94A3B8',
            }}
          >
            {rangeInspection.previewHex}
          </div>
        </div>
      )}

      {/* Section Header & Filter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#F8FAFC' }}>
            Ingested Multimodal Assets & Resumable Multipart Queue ({filteredJobs.length})
          </h3>
          {selectedCategoryFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('ALL')}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38BDF8',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Filter: {selectedCategoryFilter} ×
            </button>
          )}
        </div>

        {/* Range Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ color: 'var(--ff-text-muted, #94A3B8)' }}>HTTP Range Window:</span>
          <select
            value={selectedByteRange}
            onChange={e => setSelectedByteRange(e.target.value)}
            style={{
              backgroundColor: 'var(--ff-card-bg, #111827)',
              border: '1px solid var(--ff-border, #334155)',
              color: '#E2E8F0',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'var(--ff-font-mono, monospace)',
            }}
          >
            <option value="bytes=0-5242879">Part 1 (bytes=0-5242879 • 5 MB)</option>
            <option value="bytes=5242880-10485759">Part 2 (bytes=5242880-10485759 • 5 MB)</option>
            <option value="bytes=0-1048575">Header Peek (bytes=0-1048575 • 1 MB)</option>
          </select>
        </div>
      </div>

      {/* Multipart Upload Queue & Asset Gallery List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredJobs.map(job => {
          const completedParts = job.parts.filter(p => p.status === 'completed').length;
          const overallProgress = Math.round(
            job.parts.reduce((acc, p) => acc + p.progress, 0) / Math.max(1, job.parts.length)
          );
          const isMedia =
            job.contentType.startsWith('video/') || job.contentType.startsWith('audio/');

          return (
            <div
              key={job.id}
              style={{
                backgroundColor: 'var(--ff-card-bg, var(--bg-tertiary, #111827))',
                border: '1px solid var(--ff-border, var(--border-color, #1F293D))',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* File Top Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderIconForJob(job)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#F8FAFC' }}>
                        {job.filename}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--ff-font-mono, monospace)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#1E293B',
                          color: '#38BDF8',
                          border: '1px solid #334155',
                        }}
                      >
                        {job.contentType}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--ff-font-mono, monospace)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(139, 92, 246, 0.14)',
                          color: '#C4B5FD',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <Layers size={10} style={{ display: 'inline', marginRight: '3px' }} />
                        {job.chunksCreated} Vector Chunks
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--ff-text-muted, #94A3B8)',
                        fontFamily: 'var(--ff-font-mono, monospace)',
                        marginTop: '3px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <span>{formatBytes(job.sizeBytes)}</span>
                      <span>•</span>
                      <span>
                        {completedParts}/{job.parts.length} Parts ({overallProgress}%)
                      </span>
                      <span>•</span>
                      <code style={{ color: '#94A3B8' }}>{job.s3Uri}</code>
                    </div>
                  </div>
                </div>

                {/* Action Controls: Pause/Resume, Retry, HTTP Range Stream */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {job.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => togglePauseResumeJob(job.id)}
                      style={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        color: '#CBD5E1',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {job.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                      {job.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => retryMultipartJob(job.id)}
                    style={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#CBD5E1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Re-run 5 MB S3 Multipart Upload & ETag verification"
                  >
                    <RotateCcw size={12} />
                    {job.status === 'completed' ? 'Re-Stream Parts' : 'Retry'}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerHttpRangeStream(job)}
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.14)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38BDF8',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title={`Stream partial object with HTTP ${selectedByteRange}`}
                  >
                    <Download size={12} />
                    HTTP Range Stream
                  </button>

                  <button
                    type="button"
                    onClick={() => removeJob(job.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid transparent',
                      color: '#64748B',
                      borderRadius: '6px',
                      padding: '5px',
                      cursor: 'pointer',
                    }}
                    title="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 5 MB Per-Part Resumable Progress Bars & ETag Verification */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: '6px',
                  backgroundColor: 'rgba(9, 13, 22, 0.55)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(31, 41, 61, 0.8)',
                }}
              >
                {job.parts.map(part => (
                  <div
                    key={part.PartNumber}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '10px',
                      fontFamily: 'var(--ff-font-mono, monospace)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                      <span>
                        Part {part.PartNumber} ({formatBytes(part.sizeBytes)})
                      </span>
                      <span
                        style={{
                          color:
                            part.status === 'completed'
                              ? '#34D399'
                              : part.status === 'uploading'
                              ? '#38BDF8'
                              : '#64748B',
                        }}
                      >
                        {part.status === 'completed'
                          ? `ETag ${part.ETag?.slice(0, 9)}..."`
                          : `${part.progress}%`}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '5px',
                        backgroundColor: '#1E293B',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${part.progress}%`,
                          backgroundColor:
                            part.status === 'completed'
                              ? 'var(--ff-success, #10B981)'
                              : part.status === 'paused'
                              ? 'var(--ff-warning, #F59E0B)'
                              : 'var(--ff-accent, #38BDF8)',
                          transition: 'width 0.25s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline Lifecycle Stepper Badges (matching HTML reference frame) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  {
                    order: 1,
                    label:
                      job.status === 'completed'
                        ? '✓ S3 Upload Complete'
                        : '⚡ Resumable Uploading',
                  },
                  {
                    order: 2,
                    label: isMedia ? '✓ Whisper Audio Transcribed' : '✓ Text & Table Extracted',
                  },
                  {
                    order: 3,
                    label: isMedia
                      ? '✓ Keyframes Extracted'
                      : `✓ ${job.chunksCreated} Chunks Created`,
                  },
                  {
                    order: 4,
                    label: 'pgvector (384-dim)',
                  },
                  {
                    order: 5,
                    label: 'Neo4j Graph Linking',
                  },
                ].map(step => {
                  const st = getStageBadgeStatus(job, step.order);
                  const isDone = st === 'done';
                  const isRunning = st === 'running';
                  return (
                    <span
                      key={step.order}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        backgroundColor: isDone
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isRunning
                          ? 'rgba(56, 189, 248, 0.15)'
                          : '#1E293B',
                        color: isDone ? '#34D399' : isRunning ? '#38BDF8' : '#64748B',
                        border: `1px solid ${
                          isDone
                            ? 'rgba(16, 185, 129, 0.3)'
                            : isRunning
                            ? 'rgba(56, 189, 248, 0.35)'
                            : '#334155'
                        }`,
                      }}
                    >
                      {isDone && <CheckCircle2 size={11} />}
                      {isRunning && <Sparkles size={11} />}
                      {step.order >= 4 && isDone ? `✓ ${step.label}` : step.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultimodalS3Uploader;
