import { create } from 'zustand'
import type { AppStep } from '@/types'

interface AppState {
  step: AppStep
  conversionProgress: number
  conversionStepLabel: string
  error: string | null

  setStep: (step: AppStep) => void
  setProgress: (progress: number, label?: string) => void
  setError: (error: string) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  step: 'idle',
  conversionProgress: 0,
  conversionStepLabel: '',
  error: null,

  setStep: (step) => set({ step }),
  setProgress: (progress, label = '') =>
    set({ conversionProgress: progress, conversionStepLabel: label }),
  setError: (error) => set({ step: 'error', error }),
  reset: () =>
    set({
      step: 'idle',
      conversionProgress: 0,
      conversionStepLabel: '',
      error: null,
    }),
}))
