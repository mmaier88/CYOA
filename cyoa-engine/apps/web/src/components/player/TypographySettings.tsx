import { useTypographyStore, type FontFamily, type FontSize } from '../../store/typographyStore';

// Settings icon
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans-serif' },
  { value: 'mono', label: 'Monospace' },
];

const SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

interface TypographySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TypographySettings({ isOpen, onClose }: TypographySettingsProps) {
  const { fontFamily, fontSize, lineHeight, setFontFamily, setFontSize, setLineHeight, reset } =
    useTypographyStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm mx-4 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-main">Reading Settings</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <label className="text-sm text-text-muted">Font</label>
          <div className="flex gap-2">
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontFamily(option.value)}
                className={`flex-1 py-2 px-3 rounded border text-sm transition-colors ${
                  fontFamily === option.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-text-main border-border hover:border-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <label className="text-sm text-text-muted">Size</label>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontSize(option.value)}
                className={`flex-1 py-2 px-2 rounded border text-sm transition-colors ${
                  fontSize === option.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-text-main border-border hover:border-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div className="space-y-2">
          <label className="text-sm text-text-muted">Line Spacing: {lineHeight.toFixed(2)}</label>
          <input
            type="range"
            min="1.5"
            max="2.0"
            step="0.05"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-primary
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Reset */}
        <button
          onClick={reset}
          className="w-full py-2 text-sm text-text-muted hover:text-text-main transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

// Toggle button for settings
export function TypographyToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-text-muted hover:text-text-main transition-colors"
      title="Reading settings"
    >
      <SettingsIcon />
    </button>
  );
}
