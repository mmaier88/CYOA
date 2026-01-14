import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatorStore } from '../../store/creatorStore';
import { Progress } from '../ui/Progress';
import { Button } from '../ui/Button';

export function GenerationProgress() {
  const navigate = useNavigate();
  const { jobId, status, progress, message, error, pollStatus, reset } = useCreatorStore();
  const [dots, setDots] = useState('');

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll for status updates
  useEffect(() => {
    if (!jobId || status === 'succeeded' || status === 'failed') return;

    const pollInterval = setInterval(async () => {
      const isComplete = await pollStatus();
      if (isComplete) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, status, pollStatus]);

  const handlePlayStory = () => {
    if (jobId) {
      navigate(`/play/${jobId}`);
    }
  };

  const handleStartOver = () => {
    reset();
    navigate('/create');
  };

  if (status === 'failed') {
    return (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <div className="text-6xl">😔</div>
          <h2 className="text-2xl font-bold text-text-main">Generation Failed</h2>
          <p className="text-text-muted">{error || 'Something went wrong while creating your story.'}</p>
        </div>
        <Button onClick={handleStartOver}>Try Again</Button>
      </div>
    );
  }

  if (status === 'succeeded') {
    return (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <div className="text-6xl">✨</div>
          <h2 className="text-2xl font-bold text-text-main">Your Story is Ready!</h2>
          <p className="text-text-muted">Your adventure awaits. Are you ready to begin?</p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={handleStartOver}>
            Create Another
          </Button>
          <Button onClick={handlePlayStory} size="lg">
            Start Playing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <div className="text-6xl pulse-subtle">📖</div>
        <h2 className="text-2xl font-bold text-text-main">Creating Your Story{dots}</h2>
        <p className="text-text-muted">{message || 'Weaving your adventure...'}</p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} />
        <p className="text-sm text-text-muted">{progress}% complete</p>
      </div>

      <div className="p-4 bg-surface rounded-lg text-left text-sm text-text-muted">
        <p className="font-medium text-text-main mb-2">What's happening?</p>
        <ul className="space-y-1">
          <li className={progress >= 5 ? 'text-primary' : ''}>• Building your story world</li>
          <li className={progress >= 20 ? 'text-primary' : ''}>• Creating branching paths</li>
          <li className={progress >= 50 ? 'text-primary' : ''}>• Writing scene narratives</li>
          <li className={progress >= 80 ? 'text-primary' : ''}>• Crafting meaningful endings</li>
          <li className={progress >= 95 ? 'text-primary' : ''}>• Final polish</li>
        </ul>
      </div>
    </div>
  );
}
