import { useCreatorStore } from '../../store/creatorStore';
import { GenreSelector } from './GenreSelector';
import { DetailsSelector } from './DetailsSelector';
import { PremiseInput } from './PremiseInput';
import { PlayerInput } from './PlayerInput';
import { GenerationProgress } from './GenerationProgress';

export function StoryCreatorWizard() {
  const currentStep = useCreatorStore((s) => s.currentStep);

  return (
    <div className="max-w-2xl mx-auto">
      {currentStep === 'genre' && <GenreSelector />}
      {currentStep === 'details' && <DetailsSelector />}
      {currentStep === 'premise' && <PremiseInput />}
      {currentStep === 'player' && <PlayerInput />}
      {currentStep === 'generating' && <GenerationProgress />}
    </div>
  );
}
