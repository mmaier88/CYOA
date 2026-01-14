import { useCreatorStore } from '../../store/creatorStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Tone, Difficulty, Preset } from '../../api/types';

const TONES: { id: Tone; name: string; description: string }[] = [
  { id: 'light', name: 'Light', description: 'Upbeat, fun, and hopeful' },
  { id: 'balanced', name: 'Balanced', description: 'Mix of light and dark moments' },
  { id: 'dark', name: 'Dark', description: 'Serious, gritty, and intense' },
];

const DIFFICULTIES: { id: Difficulty; name: string; description: string }[] = [
  { id: 'forgiving', name: 'Forgiving', description: 'Most choices lead to good outcomes' },
  { id: 'normal', name: 'Normal', description: 'Choices have meaningful consequences' },
  { id: 'punishing', name: 'Punishing', description: 'Wrong choices can lead to bad endings' },
];

const PRESETS: { id: Preset; name: string; description: string }[] = [
  { id: 'quick', name: 'Quick', description: '5-8 scenes, ~5 min playtime' },
  { id: 'standard', name: 'Standard', description: '10-15 scenes, ~15 min playtime' },
  { id: 'epic', name: 'Epic', description: '20+ scenes, ~30 min playtime' },
];

export function DetailsSelector() {
  const { tone, difficulty, preset, setTone, setDifficulty, setPreset, nextStep, prevStep } =
    useCreatorStore();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-text-main">Story Settings</h2>
        <p className="text-text-muted">Customize your experience</p>
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <h3 className="font-medium text-text-main">Tone</h3>
        <div className="grid grid-cols-3 gap-3">
          {TONES.map((t) => (
            <Card
              key={t.id}
              interactive
              selected={tone === t.id}
              onClick={() => setTone(t.id)}
              className="text-center"
            >
              <h4 className="font-medium text-text-main">{t.name}</h4>
              <p className="text-xs text-text-muted mt-1">{t.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-3">
        <h3 className="font-medium text-text-main">Difficulty</h3>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <Card
              key={d.id}
              interactive
              selected={difficulty === d.id}
              onClick={() => setDifficulty(d.id)}
              className="text-center"
            >
              <h4 className="font-medium text-text-main">{d.name}</h4>
              <p className="text-xs text-text-muted mt-1">{d.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Story Length */}
      <div className="space-y-3">
        <h3 className="font-medium text-text-main">Story Length</h3>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <Card
              key={p.id}
              interactive
              selected={preset === p.id}
              onClick={() => setPreset(p.id)}
              className="text-center"
            >
              <h4 className="font-medium text-text-main">{p.name}</h4>
              <p className="text-xs text-text-muted mt-1">{p.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
