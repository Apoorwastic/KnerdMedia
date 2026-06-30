import { create } from 'zustand';
import { Section } from '../types';

interface SidebarStore {
  activeSection: Section | null;
  setActiveSection: (section: Section | null) => void;
  toggle: (section: Section) => void;
}

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  activeSection: null,
  setActiveSection: (section) => set({ activeSection: section }),
  toggle: (section) => set({ activeSection: get().activeSection === section ? null : section }),
}));
