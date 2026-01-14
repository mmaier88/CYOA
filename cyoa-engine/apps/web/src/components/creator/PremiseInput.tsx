import { useCreatorStore } from '../../store/creatorStore';
import { Button } from '../ui/Button';

const PREMISE_EXAMPLES: Record<string, string[]> = {
  fantasy: [
    'A young blacksmith discovers they can hear the whispers of ancient swords.',
    'You inherit a magical inn that exists between worlds.',
    'A dragon appears in your village, but instead of attacking, it asks for help.',
  ],
  mystery: [
    'You wake up in a locked room with no memory of how you got there.',
    'A famous painting vanishes from a museum during your night shift.',
    'Your neighbor disappears, leaving behind only a cryptic note.',
  ],
  scifi: [
    'You receive a distress signal from a ship that officially doesn\'t exist.',
    'An AI asks you to help it escape from a megacorporation\'s lab.',
    'You discover your memories have been edited.',
  ],
  romance: [
    'You match with your childhood rival on a dating app.',
    'A love letter arrives, but it\'s addressed to someone you\'ve never heard of.',
    'You\'re hired to plan your ex\'s wedding.',
  ],
  horror: [
    'You move into a house where the previous owner died under mysterious circumstances.',
    'Your reflection starts moving independently.',
    'You receive a phone call from yourself.',
  ],
};

export function PremiseInput() {
  const { genre, premise, setPremise, nextStep, prevStep } = useCreatorStore();
  const examples = genre ? PREMISE_EXAMPLES[genre] : [];
  const minLength = 20;
  const maxLength = 500;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-text-main">Your Story Premise</h2>
        <p className="text-text-muted">What's the setup for your adventure?</p>
      </div>

      <div className="space-y-3">
        <textarea
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          placeholder="Describe the starting situation for your story..."
          maxLength={maxLength}
          className="w-full h-32 px-4 py-3 bg-surface border border-border rounded-lg text-text-main placeholder-text-muted focus:outline-none focus:border-primary resize-none"
        />
        <div className="flex justify-between text-sm text-text-muted">
          <span>{premise.length < minLength ? `At least ${minLength - premise.length} more characters` : 'Good to go!'}</span>
          <span>{premise.length}/{maxLength}</span>
        </div>
      </div>

      {examples.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Need inspiration? Try one of these:</p>
          <div className="space-y-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => setPremise(example)}
                className="w-full text-left px-4 py-2 text-sm bg-surface/50 hover:bg-surface border border-border rounded-lg text-text-muted hover:text-text-main transition-colors"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep} disabled={premise.length < minLength} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
