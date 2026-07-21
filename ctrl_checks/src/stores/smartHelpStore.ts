import { create } from 'zustand';
import type { AIHelpTip } from '@/lib/smart-help/types';

export type TipStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SmartHelpState {
  active: boolean;
  tip: AIHelpTip | null;
  tipStatus: TipStatus;
  anchorRect: AnchorRect | null;
  pinned: boolean;
  cache: Map<string, AIHelpTip>;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  setTip: (tip: AIHelpTip | null, status: TipStatus) => void;
  setAnchor: (rect: AnchorRect | null, pinned: boolean) => void;
  clearTip: () => void;
  getCached: (key: string) => AIHelpTip | undefined;
  setCached: (key: string, tip: AIHelpTip) => void;
}

export const useSmartHelpStore = create<SmartHelpState>((set, get) => ({
  active: false,
  tip: null,
  tipStatus: 'idle',
  anchorRect: null,
  pinned: false,
  cache: new Map(),

  activate: () => set({ active: true }),
  deactivate: () =>
    set({ active: false, tip: null, tipStatus: 'idle', anchorRect: null, pinned: false }),
  toggle: () => (get().active ? get().deactivate() : get().activate()),

  setTip: (tip, status) => set({ tip, tipStatus: status }),
  setAnchor: (rect, pinned) => set({ anchorRect: rect, pinned }),
  clearTip: () => set({ tip: null, tipStatus: 'idle', anchorRect: null, pinned: false }),

  getCached: (key) => get().cache.get(key),
  setCached: (key, tip) => {
    const cache = get().cache;
    cache.set(key, tip);
    set({ cache });
  },
}));
