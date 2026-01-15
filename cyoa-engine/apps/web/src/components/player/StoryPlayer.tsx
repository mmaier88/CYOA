import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { SceneDisplay } from './SceneDisplay';
import { DecisionButtons } from './DecisionButtons';
import { EndingScreen } from './EndingScreen';
import { SceneAudioPlayer } from '../audio/SceneAudioPlayer';
import { TypographySettings, TypographyToggle } from './TypographySettings';

interface StoryPlayerProps {
  jobId: string;
}

export function StoryPlayer({ jobId }: StoryPlayerProps) {
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPlaythroughId, setSavedPlaythroughId] = useState<string | null>(null);
  const [showTypography, setShowTypography] = useState(false);

  const {
    story,
    currentScene,
    isComplete,
    isLoading,
    error,
    loadStory,
    startPlay,
    resumePlay,
    getSavedPlaythrough,
    clearSavedPlaythrough,
  } = usePlayerStore();

  // Load story on mount and check for saved playthrough
  useEffect(() => {
    loadStory(jobId).then(() => {
      // Check for saved playthrough
      const saved = getSavedPlaythrough(jobId);
      if (saved) {
        setSavedPlaythroughId(saved.playthroughId);
        setShowResumePrompt(true);
      } else {
        // Start fresh playthrough
        startPlay();
      }
    });
  }, [jobId, loadStory, startPlay, getSavedPlaythrough]);

  // Handle resume choice
  const handleResume = () => {
    setShowResumePrompt(false);
    if (savedPlaythroughId) {
      resumePlay(savedPlaythroughId);
    }
  };

  const handleStartNew = () => {
    setShowResumePrompt(false);
    clearSavedPlaythrough(jobId);
    startPlay();
  };

  // Show resume prompt
  if (showResumePrompt && story) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-6 max-w-md mx-auto p-6 bg-surface rounded-lg border border-border">
          <h2 className="text-xl font-bold text-text-main">Continue your adventure?</h2>
          <p className="text-text-muted">
            You have an unfinished playthrough of <span className="text-primary">{story.title}</span>.
            Would you like to continue where you left off?
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleResume}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Continue
            </button>
            <button
              onClick={handleStartNew}
              className="px-6 py-2 bg-background text-text-main border border-border rounded-lg hover:bg-surface transition-colors font-medium"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-text-muted">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="text-6xl">:(</div>
          <h2 className="text-xl font-bold text-text-main">Something went wrong</h2>
          <p className="text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (isComplete && currentScene) {
    return <EndingScreen scene={currentScene} storyTitle={story?.title} />;
  }

  if (!currentScene) {
    return null;
  }

  return (
    <>
      {/* Typography settings modal */}
      <TypographySettings isOpen={showTypography} onClose={() => setShowTypography(false)} />

      <div className="max-w-2xl mx-auto space-y-8 scene-enter">
        {story && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-medium text-primary">{story.title}</h1>
              <TypographyToggle onClick={() => setShowTypography(true)} />
            </div>
            {/* Audio player button */}
            <SceneAudioPlayer
              storyId={jobId}
              storyTitle={story.title}
              sceneId={currentScene.id}
            />
          </div>
        )}

        <SceneDisplay content={currentScene.content} />

        {currentScene.decisions.length > 0 && (
          <DecisionButtons decisions={currentScene.decisions} />
        )}
      </div>
    </>
  );
}
