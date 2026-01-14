import { useCreatorStore } from '../../store/creatorStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Genre } from '../../api/types';

const GENRES: { id: Genre; name: string; description: string; icon: string }[] = [
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Magic, mythical creatures, and epic quests',
    icon: '🏰',
  },
  {
    id: 'mystery',
    name: 'Mystery',
    description: 'Unravel secrets, solve crimes, and uncover truths',
    icon: '🔍',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    description: 'Future technology, space exploration, and alien worlds',
    icon: '🚀',
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Love, relationships, and emotional journeys',
    icon: '💕',
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Suspense, terror, and things that go bump in the night',
    icon: '👻',
  },
];

export function GenreSelector() {
  const { genre, setGenre, nextStep } = useCreatorStore();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-text-main">Choose Your Genre</h2>
        <p className="text-text-muted">What kind of adventure awaits you?</p>
      </div>

      <div className="grid gap-3">
        {GENRES.map((g) => (
          <Card
            key={g.id}
            interactive
            selected={genre === g.id}
            onClick={() => setGenre(g.id)}
            className="flex items-center gap-4"
          >
            <span className="text-3xl">{g.icon}</span>
            <div>
              <h3 className="font-semibold text-text-main">{g.name}</h3>
              <p className="text-sm text-text-muted">{g.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={!genre} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
