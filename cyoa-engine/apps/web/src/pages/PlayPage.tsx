import { useParams } from 'react-router-dom';
import { StoryPlayer } from '../components/player/StoryPlayer';

export function PlayPage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">No story specified</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <StoryPlayer jobId={jobId} />
    </div>
  );
}
