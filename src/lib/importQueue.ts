import { MAX_FILE_SIZE_MB } from '@/constants/config'
import type { ImportJob, LoadedModel } from '@/types'
import { convertIfcToFrag } from './ifcConverter'
import { formatDuration } from './downloadUtils'
import { useImportStore } from '@/store/useImportStore'
import { useModelStore } from '@/store/useModelStore'
import { toast } from '@/store/useViewerStore'

/**
 * Files wait here until it is their turn. Conversion is CPU-heavy, so jobs
 * run one after another; anything dropped meanwhile simply joins the queue.
 */
const pending = new Map<string, File>()
let running = false

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`

const isFrag = (name: string) => name.toLowerCase().endsWith('.frag')
const isIfc = (name: string) => name.toLowerCase().endsWith('.ifc')

/** Lets the browser paint before a long, blocking step starts. */
const nextFrame = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))

export function importFiles(input: FileList | File[]) {
  const files = Array.from(input)
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
  const jobs: ImportJob[] = []

  for (const file of files) {
    if (!isIfc(file.name) && !isFrag(file.name)) {
      toast(`${file.name} was skipped: only .ifc and .frag files are supported`, 'error')
      continue
    }
    if (file.size > maxBytes) {
      toast(`${file.name} was skipped: larger than ${MAX_FILE_SIZE_MB} MB`, 'error')
      continue
    }
    const id = newId('job')
    pending.set(id, file)
    jobs.push({
      id,
      fileName: file.name,
      sizeBytes: file.size,
      status: 'queued',
      progress: 0,
      label: 'Waiting',
    })
  }

  if (jobs.length === 0) return
  useImportStore.getState().addJobs(jobs)
  void pump()
}

export function dismissJob(id: string) {
  pending.delete(id)
  useImportStore.getState().removeJob(id)
}

async function pump() {
  if (running) return
  running = true
  try {
    for (;;) {
      const job = useImportStore.getState().jobs.find(j => j.status === 'queued')
      if (!job) break
      await runJob(job)
    }
  } finally {
    running = false
  }
}

async function runJob(job: ImportJob) {
  const { updateJob, removeJob } = useImportStore.getState()
  const file = pending.get(job.id)
  pending.delete(job.id)
  if (!file) {
    removeJob(job.id)
    return
  }

  try {
    updateJob(job.id, { status: 'reading', label: 'Reading file' })
    const buffer = await file.arrayBuffer()

    let model: LoadedModel
    if (isFrag(file.name)) {
      model = {
        modelId: newId('model'),
        originalFileName: file.name,
        originalFileSizeBytes: file.size,
        convertedFileSizeBytes: buffer.byteLength,
        conversionTimeMs: 0,
        fragBytes: buffer,
        source: 'frag',
      }
    } else {
      updateJob(job.id, { status: 'converting', label: 'Starting conversion' })
      await nextFrame()

      let lastPaint = 0
      const { fragBytes, conversionTimeMs } = await convertIfcToFrag(
        new Uint8Array(buffer),
        (progress, label) => {
          // Progress fires very often; a few updates per second is plenty.
          const now = performance.now()
          if (now - lastPaint < 80 && progress < 1) return
          lastPaint = now
          updateJob(job.id, { progress, label: label || 'Converting' })
        }
      )
      model = {
        modelId: newId('model'),
        originalFileName: file.name,
        originalFileSizeBytes: file.size,
        convertedFileSizeBytes: fragBytes.byteLength,
        conversionTimeMs,
        fragBytes,
        source: 'ifc',
      }
      toast(`Converted ${file.name} in ${formatDuration(conversionTimeMs)}`, 'success')
    }

    useModelStore.getState().addModel(model)
    removeJob(job.id)
  } catch (err: any) {
    console.error('Import failed', err)
    const message = err?.message ?? 'Conversion failed'
    updateJob(job.id, { status: 'error', error: message, label: 'Failed' })
    toast(`${file.name} could not be imported`, 'error')
  }
}
