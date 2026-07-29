import { useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { UploadZone } from '@/components/upload/UploadZone'
import { ConversionProgress } from '@/components/upload/ConversionProgress'
import { ModelInfoPanel } from '@/components/model/ModelInfoPanel'
import { DownloadButton } from '@/components/download/DownloadButton'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'

interface SidebarProps {
  onFiles: (files: File[]) => void
  engineRef: React.MutableRefObject<FragmentsEngine | null>
}

export function Sidebar({ onFiles, engineRef }: SidebarProps) {
  const step = useAppStore(s => s.step)
  const conversionProgress = useAppStore(s => s.conversionProgress)
  const conversionStepLabel = useAppStore(s => s.conversionStepLabel)
  const error = useAppStore(s => s.error)
  const { reset } = useAppStore()

  const models = useModelStore(s => s.models)
  const clearModels = useModelStore(s => s.clearModels)

  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Ref to store the current processing file name to show in the progress bar
  const currentFileNameRef = useRef<string>('')
  // If we have a model converting, we can show its original file name. 
  // We don't track the queue in the store yet, so we just rely on `fileNameRef` updated from App.tsx 
  // or we can pass `currentConvertingFile` as a prop. Let's just use the latest uploaded for now.

  const handleClearAll = () => {
    const engine = engineRef.current
    if (engine && models.length > 0) {
      models.forEach(m => {
        engine.fragments.disposeModel(m.modelId).catch(() => {})
      })
    }
    clearModels()
    reset()
  }

  const handleAddAnother = () => {
    fileInputRef.current?.click()
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const validFiles: File[] = []
      for (let i = 0; i < files.length; i++) validFiles.push(files[i])
      onFiles(validFiles)
    }
    e.target.value = ''
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">

        {(step === 'idle') && (
          <UploadZone onFiles={onFiles} />
        )}

        {(step === 'uploading') && (
          <div className="sidebar-status">
            <div className="conversion-spinner" />
            <p>Reading files...</p>
          </div>
        )}

        {(step === 'converting') && (
          <ConversionProgress
            progress={conversionProgress}
            stepLabel={conversionStepLabel}
            fileName="Converting models..."
          />
        )}

        {(step === 'viewing') && (
          <>
            <ModelInfoPanel engineRef={engineRef} />
            <DownloadButton engineRef={engineRef} />
            <button className="add-another-btn" onClick={handleAddAnother}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Add another model
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ifc,.frag"
              multiple
              onChange={onInputChange}
              style={{ display: 'none' }}
            />
            <button className="load-another-btn" onClick={handleClearAll} style={{ marginTop: 8 }}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
              Clear all models
            </button>
          </>
        )}

        {(step === 'error') && (
          <div className="sidebar-error">
            <div className="sidebar-error-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p className="sidebar-error-title">Conversion failed</p>
            <p className="sidebar-error-msg">{error}</p>
            <button className="retry-btn" onClick={handleClearAll}>Try again</button>
          </div>
        )}

      </div>
    </aside>
  )
}
