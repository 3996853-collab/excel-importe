
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TemplateMapping } from '@/types/import';

interface TemplateState {
  templates: Record<string, TemplateMapping>;
  saveTemplate: (hash: string, mappings: { fileHeader: string; targetField: string }[]) => void;
  getTemplate: (hash: string) => TemplateMapping | undefined;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: {},
      saveTemplate: (hash, mappings) => {
        set((state) => ({
          templates: {
            ...state.templates,
            [hash]: {
              hash,
              mappings,
              lastUsed: Date.now(),
            },
          },
        }));
      },
      getTemplate: (hash) => get().templates[hash],
    }),
    {
      name: 'excel-import-templates',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
