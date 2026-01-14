import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { SceneDisplay } from './SceneDisplay';
import { DecisionButtons } from './DecisionButtons';
import { EndingScreen } from './EndingScreen';

interface StoryPlayerProps {
  jobId: string;
}

export function StoryPlayer({ jobId }: StoryPlayerProps) {
  const {
    story,
    currentScene,
    isComplete,
    isLoading,
    error,
    loadStory,
    startPlay,
  } = usePlayerStore();

  // Load story on mount
  useEffect(() => {
    loadStory(jobId).then(() => {
      // Start playthrough after loading
      startPlay();
    });
  }, [jobId, loadStory, startPlay]);

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
          <div className="text-6xl">😔</div>
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
    <div className="max-w-2xl mx-auto space-y-8 scene-enter">
      {story && (
        <div className="text-center">
          <h1 className="text-lg font-medium text-primary">{story.title}</h1>
        </div>
      )}

      <SceneDisplay content={currentScene.content} />

      {currentScene.decisions.length > 0 && (
        <DecisionButtons decisions={currentScene.decisions} />
      )}
    </div>
  );
}
