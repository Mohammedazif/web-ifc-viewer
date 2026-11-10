import { Icon } from '@/components/ui/Icon'
import type { ImportJob, LoadedModel } from '@/types'
import { downloadModel, formatBytes, formatDuration } from '@/lib/downloadUtils'
import { dismissJob } from '@/lib/importQueue'
import { focusModel, removeModel, setModelVisible } from '@/lib/viewerActions'
import { useImportStore } from '@/store/useImportStore'
import { useModelStore } from '@/store/useModelStore'

function modelMeta(model: LoadedModel) {
  if (model.source === 'frag') return `${formatBytes(model.convertedFileSizeBytes)} · fragments file`
  const saved = model.originalFileSizeBytes > 0
    ? Math.round((1 - model.convertedFileSizeBytes / model.originalFileSizeBytes) * 100)
    : 0
  const sizes = `${formatBytes(model.originalFileSizeBytes)} → ${formatBytes(model.convertedFileSizeBytes)}`
  const ratio = saved > 0 ? ` · ${saved}% smaller` : ''
  return `${sizes}${ratio} · ${formatDuration(model.conversionTimeMs)}`
}

function ModelCard({ model }: { model: LoadedModel }) {
  const visible = useModelStore(s => s.modelVisibility[model.modelId] !== false)
  const loaded = useModelStore(s => !!s.modelsLoadedInEngine[model.modelId])

  return (
    <li className={`model-card ${visible ? '' : 'is-hidden'}`}>
      <button
        className="icon-btn icon-btn-sm"
        onClick={() => setModelVisible(model.modelId, !visible)}
        disabled={!loaded}
        aria-label={visible ? `Hide ${model.originalFileName}` : `Show ${model.originalFileName}`}
        aria-pressed={!visible}
        title={visible ? 'Hide model' : 'Show model'}
      >
        {loaded ? <Icon name={visible ? 'eye' : 'eyeOff'} size={15} /> : <span className="spinner spinner-sm" />}
      </button>

      <button
        className="model-card-main"
        onClick={() => focusModel(model.modelId)}
        disabled={!loaded || !visible}
        title={`${model.originalFileName}: click to zoom to this model`}
      >
        <span className="model-card-name">{model.originalFileName}</span>
        <span className="model-card-meta">{loaded ? modelMeta(model) : 'Loading into the scene…'}</span>
      </button>

      <div className="model-card-actions">
        <button
          className="icon-btn icon-btn-sm"
          onClick={() => downloadModel(model)}
          disabled={!loaded}
          aria-label={`Download ${model.originalFileName} as .frag`}
          title="Download .frag"
        >
          <Icon name="download" size={15} />
        </button>
        <button
          className="icon-btn icon-btn-sm danger"
          onClick={() => removeModel(model.modelId)}
          aria-label={`Remove ${model.originalFileName}`}
          title="Remove model"
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </li>
  )
}

export function JobCard({ job }: { job: ImportJob }) {
  const pct = Math.round(job.progress * 100)
  const failed = job.status === 'error'
  const queued = job.status === 'queued'

  return (
    <li className={`job-card ${failed ? 'is-error' : ''}`}>
      <div className="job-card-row">
        {failed ? <Icon name="alert" size={15} className="job-card-icon" /> : <span className={`spinner spinner-sm ${queued ? 'is-idle' : ''}`} />}
        <span className="job-card-name" title={job.fileName}>{job.fileName}</span>
        {job.status === 'converting' && <span className="job-card-pct">{pct}%</span>}
        {(failed || queued) && (
          <button
            className="icon-btn icon-btn-sm"
            onClick={() => dismissJob(job.id)}
            aria-label={failed ? `Dismiss ${job.fileName}` : `Cancel ${job.fileName}`}
            title={failed ? 'Dismiss' : 'Remove from queue'}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {job.status === 'converting' && (
        <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="job-card-label">
        {failed ? job.error : queued ? `Waiting · ${formatBytes(job.sizeBytes)}` : job.label}
      </p>
    </li>
  )
}

export function ModelList() {
  const models = useModelStore(s => s.models)
  const jobs = useImportStore(s => s.jobs)

  return (
    <ul className="model-list">
      {models.map(model => <ModelCard key={model.modelId} model={model} />)}
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </ul>
  )
}
