import { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import type { Decision } from '../../api/types';

interface DecisionButtonsProps {
  decisions: Decision[];
}

export function DecisionButtons({ decisions }: DecisionButtonsProps) {
  const { selectDecision, isDeciding } = usePlayerStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = async (decision: Decision) => {
    if (isDeciding) return;

    setSelectedId(decision.id);

    // Brief delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));

    await selectDecision(decision.id);
    setSelectedId(null);
  };

  // Sort by choice order
  const sortedDecisions = [...decisions].sort((a, b) => a.choiceOrder - b.choiceOrder);

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <p className="text-sm text-text-muted font-medium">What do you do?</p>

      <div className="space-y-2">
        {sortedDecisions.map((decision) => (
          <button
            key={decision.id}
            onClick={() => handleSelect(decision)}
            disabled={isDeciding}
            className={`
              decision-btn w-full text-left px-4 py-3 rounded-lg border transition-all
              ${selectedId === decision.id
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-surface hover:border-primary/50 text-text-main'
              }
              ${isDeciding ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="block font-medium">{decision.text}</span>
            {decision.consequenceHint && (
              <span className="block text-sm text-text-muted mt-1 italic">
                {decision.consequenceHint}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
