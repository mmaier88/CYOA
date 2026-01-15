import { useEffect, useRef } from 'react';
import { useAudioStore } from '../../store/audioStore';

// Icons as simple SVG components
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const SkipBackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const LoadingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="animate-spin">
    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
  </svg>
);

const VolumeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SceneAudioPlayerProps {
  storyId: string;
  storyTitle: string;
  sceneId: string;
}

export function SceneAudioPlayer({ storyId, storyTitle, sceneId }: SceneAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    isVisible,
    isPlaying,
    isLoading,
    progress,
    duration,
    playbackRate,
    setAudioRef,
    loadStory,
    playScene,
    togglePlayPause,
    skipForward,
    skipBackward,
    cyclePlaybackRate,
    seekTo,
    updateProgress,
    updateDuration,
    handleEnded,
    close,
  } = useAudioStore();

  // Set audio ref on mount
  useEffect(() => {
    if (audioRef.current) {
      setAudioRef(audioRef.current);
    }
    return () => setAudioRef(null);
  }, [setAudioRef]);

  // Load story when props change
  useEffect(() => {
    loadStory(storyId, storyTitle);
  }, [storyId, storyTitle, loadStory]);

  // Handle starting audio for new scene
  const handleListen = () => {
    playScene(sceneId);
  };

  // Handle seek from progress bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  // If not visible, show listen button
  if (!isVisible) {
    return (
      <button
        onClick={handleListen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-primary/10 border border-primary/30 text-primary
                   hover:bg-primary/20 transition-colors text-sm font-medium"
      >
        <VolumeIcon />
        Listen to this scene
      </button>
    );
  }

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => updateProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => updateDuration(e.currentTarget.duration)}
        onEnded={handleEnded}
        onPlay={() => useAudioStore.setState({ isPlaying: true })}
        onPause={() => useAudioStore.setState({ isPlaying: false })}
      />

      {/* Fixed bottom player */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/98 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-2xl mx-auto">
          {/* Title and close */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-muted truncate">{storyTitle}</p>
            <button
              onClick={close}
              className="p-1 text-text-muted hover:text-text-main transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Skip back */}
            <button
              onClick={() => skipBackward(15)}
              className="p-2 text-text-muted hover:text-text-main transition-colors"
              title="Back 15s"
            >
              <SkipBackIcon />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-12 h-12 flex items-center justify-center rounded-full
                         bg-primary text-white hover:bg-primary/90 transition-colors
                         disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skipForward(15)}
              className="p-2 text-text-muted hover:text-text-main transition-colors"
              title="Forward 15s"
            >
              <SkipForwardIcon />
            </button>

            {/* Progress bar */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-text-muted font-mono w-10">
                {formatTime(progress)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-xs text-text-muted font-mono w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Speed control */}
            <button
              onClick={cyclePlaybackRate}
              className="px-2 py-1 text-xs font-medium text-text-muted
                         bg-background rounded hover:bg-border transition-colors"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind player */}
      <div className="h-24" />
    </>
  );
}

// Simple listen button for inline use
export function ListenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                 bg-primary/10 border border-primary/30 text-primary
                 hover:bg-primary/20 transition-colors text-sm font-medium"
    >
      <VolumeIcon />
      Listen
    </button>
  );
}
