import { useRef, useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { useIfcConverter } from '@/hooks/useIfcConverter'
import { useAppStore } from '@/store/useAppStore'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import { useModelStore } from '@/store/useModelStore'

export default function App() {
  const engineRef = useRef<FragmentsEngine | null>(null)
  const { convert, status } = useIfcConverter()
  const setStep = useAppStore(s => s.setStep)

  const [fileQueue, setFileQueue] = useState<File[]>([])
  const isReadingRef = useRef(false)

  const handleFiles = (files: File[]) => {
    setStep('uploading')
    setFileQueue(prev => [...prev, ...files])
  }

  useEffect(() => {
    if (status !== 'converting' && fileQueue.length > 0 && !isReadingRef.current) {
      const nextFile = fileQueue[0]
      isReadingRef.current = true
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        
        if (nextFile.name.toLowerCase().endsWith('.frag')) {
          const model = {
            modelId: `model-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
            originalFileName: nextFile.name,
            originalFileSizeBytes: nextFile.size,
            convertedFileSizeBytes: buffer.byteLength,
            conversionTimeMs: 0,
            fragBytes: buffer,
          }
          useModelStore.getState().addModel(model)
          useAppStore.getState().setStep('viewing')
          
          isReadingRef.current = false
          setFileQueue(prev => prev.slice(1))
        } else {
          convert(new Uint8Array(buffer), nextFile.name, nextFile.size)
          isReadingRef.current = false
          setFileQueue(prev => prev.slice(1))
        }
      }
      reader.onerror = () => {
        isReadingRef.current = false
        setFileQueue(prev => prev.slice(1))
      }
      reader.readAsArrayBuffer(nextFile)
    }
  }, [fileQueue, status, convert])

  const handleEngineReady = (ref: React.MutableRefObject<FragmentsEngine | null>) => {
    engineRef.current = ref.current
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar onFiles={handleFiles} engineRef={engineRef} />
        <main className="app-main">
          <ViewerCanvas onEngineReady={handleEngineReady} />
        </main>
      </div>
    </div>
  )
}
