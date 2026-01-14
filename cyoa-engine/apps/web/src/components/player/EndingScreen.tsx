import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../store/playerStore';
import { Button } from '../ui/Button';
import type { Scene, EndingQuality } from '../../api/types';

interface EndingScreenProps {
  scene: Scene;
  storyTitle?: string;
}

const ENDING_CONFIG: Record<EndingQuality, { label: string; color: string; emoji: string }> = {
  bad: { label: 'Bad Ending', color: 'text-ending-bad', emoji: '💀' },
  neutral: { label: 'Neutral Ending', color: 'text-ending-neutral', emoji: '🌙' },
  good: { label: 'Good Ending', color: 'text-ending-good', emoji: '🌟' },
  best: { label: 'Best Ending', color: 'text-ending-best', emoji: '👑' },
  secret: { label: 'Secret Ending', color: 'text-ending-secret', emoji: '🔮' },
};

export function EndingScreen({ scene, storyTitle }: EndingScreenProps) {
  const navigate = useNavigate();
  const { pathTaken, reset, startPlay } = usePlayerStore();

  const endingQuality = scene.endingQuality || 'neutral';
  const config = ENDING_CONFIG[endingQuality];

  const handlePlayAgain = async () => {
    // Reset current playthrough state but keep story loaded
    await startPlay();
  };

  const handleNewStory = () => {
    reset();
    navigate('/create');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 scene-enter">
      {/* Ending badge */}
      <div className="text-center space-y-4">
        <div className="text-6xl">{config.emoji}</div>
        <div className={`text-2xl font-bold ${config.color}`}>{config.label}</div>
        {storyTitle && <p className="text-text-muted">{storyTitle}</p>}
      </div>

      {/* Final scene content */}
      <div className="p-6 bg-surface rounded-xl border border-border">
        <div className="space-y-4">
          {scene.content.split('\n\n').filter(Boolean).map((paragraph, index) => (
            <p key={index} className="narrative-text text-text-main leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {scene.endingSummary && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-text-muted italic">{scene.endingSummary}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">{pathTaken.length}</div>
          <div className="text-sm text-text-muted">Scenes Visited</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">{pathTaken.length - 1}</div>
          <div className="text-sm text-text-muted">Decisions Made</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button variant="secondary" onClick={handleNewStory}>
          Create New Story
        </Button>
        <Button onClick={handlePlayAgain}>
          Play Again
        </Button>
      </div>
    </div>
  );
}
