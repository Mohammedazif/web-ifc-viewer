import { useCallback, useState, useRef } from 'react'
import { MAX_FILE_SIZE_MB } from '@/constants/config'

interface UploadZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function UploadZone({ onFiles, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null)
    
    const validFiles: File[] = []
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const name = file.name.toLowerCase()
      if (!name.endsWith('.ifc') && !name.endsWith('.frag')) {
        setError('Only .ifc or .frag files are supported')
        return
      }
      if (file.size > maxBytes) {
        setError(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB`)
        return
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onFiles(validFiles)
    }
  }, [onFiles])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [disabled, processFiles])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    e.target.value = ''
  }

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".ifc,.frag"
          multiple
          onChange={onInputChange}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
            <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
            <path d="M24 30V18M24 18l-5 5M24 18l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="upload-title">
          {isDragging ? 'Drop your files here' : 'Upload IFC or Frag'}
        </p>
        <p className="upload-hint">
          Drag & drop or click to browse
        </p>
        <p className="upload-meta">
          .ifc or .frag · max {MAX_FILE_SIZE_MB} MB
        </p>
      </div>

      {error && (
        <div className="upload-error">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      <div className="upload-info-cards">
        <div className="info-card">
          <span className="info-card-icon">⚡</span>
          <span>Your files never leave the browser</span>
        </div>
        <div className="info-card">
          <span className="info-card-icon">📦</span>
          <span>Converts IFC to optimized .frag binary format</span>
        </div>
        <div className="info-card">
          <span className="info-card-icon">💾</span>
          <span>Download .frag for instant future loads</span>
        </div>
      </div>
    </div>
  )
}
