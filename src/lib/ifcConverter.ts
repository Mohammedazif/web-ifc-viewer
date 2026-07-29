import * as FRAGS from '@thatopen/fragments'
import { WASM_PATH } from '@/constants/config'

export interface ConversionResult {
  fragBytes: ArrayBuffer
  conversionTimeMs: number
}

export async function convertIfcToFrag(
  bytes: Uint8Array,
  onProgress: (progress: number, label: string) => void
): Promise<ConversionResult> {
  const serializer = new FRAGS.IfcImporter()
  serializer.wasm = {
    absolute: true,
    path: WASM_PATH,
  }

  const start = performance.now()

  const result = await serializer.process({
    bytes,
    progressCallback: (progress: number, data: any) => {
      const label = data?.state ?? ''
      onProgress(progress, label)
    },
  })

  const conversionTimeMs = performance.now() - start
  // IfcImporter returns Uint8Array; get the underlying ArrayBuffer
  const fragBytes: ArrayBuffer = result instanceof Uint8Array
    ? (result.buffer as ArrayBuffer).slice(result.byteOffset, result.byteOffset + result.byteLength)
    : result as unknown as ArrayBuffer

  return { fragBytes, conversionTimeMs }
}
