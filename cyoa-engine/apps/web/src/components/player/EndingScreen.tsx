import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../store/playerStore';
import { Button } from '../ui/Button';
import type { Scene, EndingQuality } from '../../api/types';

interface EndingScreenProps {
  scene: Scene;
  storyTitle?: string;
}

const ENDING_CONFIG: Record<EndingQuality, { label: string; color: string; emoji: string; shareText: string }> = {
  bad: { label: 'Bad Ending', color: 'text-ending-bad', emoji: '💀', shareText: 'met a dark fate' },
  neutral: { label: 'Neutral Ending', color: 'text-ending-neutral', emoji: '🌙', shareText: 'found an uncertain path' },
  good: { label: 'Good Ending', color: 'text-ending-good', emoji: '🌟', shareText: 'achieved victory' },
  best: { label: 'Best Ending', color: 'text-ending-best', emoji: '👑', shareText: 'unlocked the best ending' },
  secret: { label: 'Secret Ending', color: 'text-ending-secret', emoji: '🔮', shareText: 'discovered a secret ending' },
};

// Share icon component
const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export function EndingScreen({ scene, storyTitle }: EndingScreenProps) {
  const navigate = useNavigate();
  const { pathTaken, reset, startPlay, jobId } = usePlayerStore();
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');

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

  const handleShare = async () => {
    const shareText = `${config.emoji} I ${config.shareText} in "${storyTitle || 'a CYOA story'}"! ${pathTaken.length} scenes, ${pathTaken.length - 1} decisions. Can you do better?`;
    const shareUrl = jobId ? `${window.location.origin}/play/${jobId}` : window.location.href;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${config.label} - ${storyTitle}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or not supported
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
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
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg
                     hover:bg-background transition-colors text-text-main"
        >
          <ShareIcon />
          {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'error' ? 'Failed' : 'Share'}
        </button>
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
