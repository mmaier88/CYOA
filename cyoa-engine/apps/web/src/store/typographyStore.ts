import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontFamily = 'serif' | 'sans' | 'mono';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface TypographyState {
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineHeight: number; // 1.5 to 2.0
  setFontFamily: (family: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setLineHeight: (height: number) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS = {
  fontFamily: 'serif' as FontFamily,
  fontSize: 'base' as FontSize,
  lineHeight: 1.75,
};

export const useTypographyStore = create<TypographyState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),

      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'cyoa-typography',
    }
  )
);

// CSS class mappings
export const FONT_FAMILY_CLASSES: Record<FontFamily, string> = {
  serif: 'font-serif',
  sans: 'font-sans',
  mono: 'font-mono',
};

export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};
