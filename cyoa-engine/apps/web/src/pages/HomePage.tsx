import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { listStories } from '../api/client';
import type { StoryListItem } from '../api/types';

const GENRE_EMOJI: Record<string, string> = {
  fantasy: '🏰',
  mystery: '🔍',
  scifi: '🚀',
  romance: '💕',
  horror: '👻',
};

export function HomePage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStories()
      .then((res) => setStories(res.stories))
      .catch((err) => console.error('Failed to load stories:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-text-main">
            Your Story,
            <br />
            <span className="text-primary">Your Choices</span>
          </h1>
          <p className="text-lg text-text-muted">
            Create unique interactive adventures powered by AI.
            Every decision shapes your story.
          </p>
          <Button onClick={() => navigate('/create')} size="lg" className="px-8">
            Create New Story
          </Button>
        </div>

        {/* Story Browser */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-text-main">Available Stories</h2>

          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading stories...</div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No stories yet. Create your first one!
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {stories.map((story) => (
                <Card
                  key={story.id}
                  interactive
                  onClick={() => navigate(`/play/${story.jobId}`)}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{GENRE_EMOJI[story.genre] || '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-primary font-medium">
                          {story.genre}
                        </span>
                        <span className="text-xs text-text-muted">
                          {story.totalScenes} scenes
                        </span>
                      </div>
                      <p className="text-text-main font-medium line-clamp-2">
                        {story.premise}
                      </p>
                      {story.playerName && (
                        <p className="text-sm text-text-muted mt-1">
                          Play as: {story.playerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{story.totalEndings} endings</span>
                    <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
          <div className="text-center">
            <div className="text-2xl mb-1">🎭</div>
            <div className="text-xs text-text-muted">5 Genres</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🌳</div>
            <div className="text-xs text-text-muted">Branching Paths</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">✨</div>
            <div className="text-xs text-text-muted">Multiple Endings</div>
          </div>
        </div>
      </div>
    </div>
  );
}
