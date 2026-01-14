import { useNavigate } from 'react-router-dom';
import { useCreatorStore } from '../../store/creatorStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function PlayerInput() {
  const navigate = useNavigate();
  const {
    playerName,
    playerGender,
    playerPersonality,
    setPlayerName,
    setPlayerGender,
    setPlayerPersonality,
    prevStep,
    goToStep,
    submitStory,
  } = useCreatorStore();

  const handleSubmit = async () => {
    try {
      const jobId = await submitStory();
      goToStep('generating');
      navigate(`/generating/${jobId}`);
    } catch (err) {
      console.error('Failed to submit story:', err);
    }
  };

  const canSubmit = playerName.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-text-main">Your Character</h2>
        <p className="text-text-muted">Who will you be in this story?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Character Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your character's name"
            maxLength={30}
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">Character Pronoun</label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as const).map((g) => (
              <Card
                key={g}
                interactive
                selected={playerGender === g}
                onClick={() => setPlayerGender(g)}
                className="text-center py-2"
              >
                <span className="text-sm text-text-main">{g === 'male' ? 'He/Him' : 'She/Her'}</span>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Personality (optional)
          </label>
          <input
            type="text"
            value={playerPersonality}
            onChange={(e) => setPlayerPersonality(e.target.value)}
            placeholder="e.g., cautious, brave, curious"
            maxLength={50}
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-text-muted">
            This will influence how the story addresses you
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
          Create My Story
        </Button>
      </div>
    </div>
  );
}
