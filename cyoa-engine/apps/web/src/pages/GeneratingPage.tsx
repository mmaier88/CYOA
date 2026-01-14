import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCreatorStore } from '../store/creatorStore';
import { GenerationProgress } from '../components/creator/GenerationProgress';

export function GeneratingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { jobId: storedJobId, goToStep } = useCreatorStore();

  // If arriving at this page directly (e.g., via URL), set up the store
  useEffect(() => {
    if (jobId && jobId !== storedJobId) {
      // The store doesn't have this job, but we can still poll for it
      useCreatorStore.setState({
        jobId,
        status: 'running',
        currentStep: 'generating',
      });
    } else {
      goToStep('generating');
    }
  }, [jobId, storedJobId, goToStep]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <GenerationProgress />
      </div>
    </div>
  );
}
