import { create } from 'zustand'
import type { LoadedModel } from '@/types'

interface ModelState {
  models: LoadedModel[]
  modelVisibility: Record<string, boolean>
  modelsLoadedInEngine: Record<string, boolean>
  addModel: (model: LoadedModel) => void
  clearModels: () => void
  toggleVisibility: (modelId: string) => void
  markModelLoadedInEngine: (modelId: string) => void
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  modelVisibility: {},
  modelsLoadedInEngine: {},
  addModel: (model) => set((state) => ({ 
    models: [...state.models, model],
    modelVisibility: { ...state.modelVisibility, [model.modelId]: true },
    modelsLoadedInEngine: { ...state.modelsLoadedInEngine, [model.modelId]: false }
  })),
  clearModels: () => set({ models: [], modelVisibility: {}, modelsLoadedInEngine: {} }),
  toggleVisibility: (modelId) => set((state) => ({
    modelVisibility: { ...state.modelVisibility, [modelId]: !state.modelVisibility[modelId] }
  })),
  markModelLoadedInEngine: (modelId) => set((state) => ({
    modelsLoadedInEngine: { ...state.modelsLoadedInEngine, [modelId]: true }
  }))
}))
