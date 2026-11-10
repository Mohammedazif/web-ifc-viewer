import { create } from 'zustand'
import type { ImportJob } from '@/types'

interface ImportState {
  jobs: ImportJob[]
  addJobs: (jobs: ImportJob[]) => void
  updateJob: (id: string, patch: Partial<ImportJob>) => void
  removeJob: (id: string) => void
}

export const useImportStore = create<ImportState>((set) => ({
  jobs: [],
  addJobs: (jobs) => set((s) => ({ jobs: [...s.jobs, ...jobs] })),
  updateJob: (id, patch) => set((s) => ({
    jobs: s.jobs.map(j => (j.id === id ? { ...j, ...patch } : j)),
  })),
  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter(j => j.id !== id) })),
}))
