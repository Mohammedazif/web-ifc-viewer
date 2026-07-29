import { useModelStore } from '@/store/useModelStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import { useFragmentDownload } from '@/hooks/useFragmentDownload'

interface DownloadButtonProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
}

export function DownloadButton({ engineRef }: DownloadButtonProps) {
  const models = useModelStore(s => s.models)
  const { downloadAllAsZip, isDownloading } = useFragmentDownload(engineRef)

  if (!models || models.length === 0) return null

  const handleDownloadAll = async () => {
    await downloadAllAsZip(models)
  }

  return (
    <button
      className={`download-btn ${isDownloading ? 'loading' : ''}`}
      onClick={handleDownloadAll}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <span className="btn-spinner" />
          Preparing download...
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
          Download all as .zip
        </>
      )}
    </button>
  )
}
