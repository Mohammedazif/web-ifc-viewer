import { create } from 'zustand'
import type { LoadedModel } from '@/types'

interface ModelState {
  models: LoadedModel[]
  modelVisibility: Record<string, boolean>
  modelsLoadedInEngine: Record<string, boolean>
  addModel: (model: LoadedModel) => void
  removeModel: (modelId: string) => void
  clearModels: () => void
  setVisibility: (modelId: string, visible: boolean) => void
  markModelLoadedInEngine: (modelId: string) => void
}

const omit = <T,>(record: Record<string, T>, key: string) => {
  const next = { ...record }
  delete next[key]
  return next
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  modelVisibility: {},
  modelsLoadedInEngine: {},
  addModel: (model) => set((state) => ({
    models: [...state.models, model],
    modelVisibility: { ...state.modelVisibility, [model.modelId]: true },
    modelsLoadedInEngine: { ...state.modelsLoadedInEngine, [model.modelId]: false },
  })),
  removeModel: (modelId) => set((state) => ({
    models: state.models.filter(m => m.modelId !== modelId),
    modelVisibility: omit(state.modelVisibility, modelId),
    modelsLoadedInEngine: omit(state.modelsLoadedInEngine, modelId),
  })),
  clearModels: () => set({ models: [], modelVisibility: {}, modelsLoadedInEngine: {} }),
  setVisibility: (modelId, visible) => set((state) => ({
    modelVisibility: { ...state.modelVisibility, [modelId]: visible },
  })),
  markModelLoadedInEngine: (modelId) => set((state) => ({
    modelsLoadedInEngine: { ...state.modelsLoadedInEngine, [modelId]: true },
  })),
}))
