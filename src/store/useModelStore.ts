import { create } from 'zustand'
import type { LoadedModel } from '@/types'

interface ModelState {
  models: LoadedModel[]
  modelVisibility: Record<string, boolean>
  addModel: (model: LoadedModel) => void
  clearModels: () => void
  toggleVisibility: (modelId: string) => void
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  modelVisibility: {},
  addModel: (model) => set((state) => ({ 
    models: [...state.models, model],
    modelVisibility: { ...state.modelVisibility, [model.modelId]: true }
  })),
  clearModels: () => set({ models: [], modelVisibility: {} }),
  toggleVisibility: (modelId) => set((state) => ({
    modelVisibility: { ...state.modelVisibility, [modelId]: !state.modelVisibility[modelId] }
  }))
}))
