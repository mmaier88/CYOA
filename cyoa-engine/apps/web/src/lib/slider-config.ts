// Slider configuration for story creation
// Based on Chronicle's 14-slider system

import type { StorySliders } from '../api/types';

export type SliderKey = keyof StorySliders;

export interface SliderConfig {
  key: SliderKey;
  label: string;
  description: string;
  labels: [string, string, string]; // [low, mid, high]
  descriptions: [string, string, string];
  isAdvanced: boolean;
}

// Main sliders (always visible)
export const MAIN_SLIDERS: SliderConfig[] = [
  {
    key: 'violence',
    label: 'Violence',
    description: 'How graphic conflict and combat are portrayed',
    labels: ['Minimal', 'Balanced', 'Brutal'],
    descriptions: [
      'Conflict is implied or happens off-screen',
      'Violence shown but not gratuitous',
      'Graphic, visceral action sequences',
    ],
    isAdvanced: false,
  },
  {
    key: 'romance',
    label: 'Romance',
    description: 'Intensity of romantic and intimate content',
    labels: ['Minimal', 'Balanced', 'Steamy'],
    descriptions: [
      'No romance or subtle subtext only',
      'Romantic tension with tasteful scenes',
      'Passionate, explicit romantic content',
    ],
    isAdvanced: false,
  },
  {
    key: 'tone',
    label: 'Tone',
    description: 'Overall emotional feeling of the story',
    labels: ['Hopeful', 'Bittersweet', 'Tragic'],
    descriptions: [
      'Uplifting, optimistic, triumph of good',
      'Mixed emotions, realistic outcomes',
      'Dark, devastating, potentially bleak',
    ],
    isAdvanced: false,
  },
];

// Advanced sliders (behind toggle)
export const ADVANCED_SLIDERS: SliderConfig[] = [
  {
    key: 'darkness',
    label: 'Darkness',
    description: 'Thematic heaviness and mature themes',
    labels: ['Light', 'Gray', 'Dark'],
    descriptions: [
      'Wholesome, family-friendly themes',
      'Some moral complexity and shade',
      'Grimdark, challenging themes',
    ],
    isAdvanced: true,
  },
  {
    key: 'emotionalIntensity',
    label: 'Emotional Intensity',
    description: 'How deeply the story aims to affect you',
    labels: ['Gentle', 'Moderate', 'Intense'],
    descriptions: [
      'Light emotional touch, comfortable',
      'Meaningful moments without overwhelming',
      'Cathartic, deeply moving experiences',
    ],
    isAdvanced: true,
  },
  {
    key: 'pacing',
    label: 'Pacing',
    description: 'Speed at which the story unfolds',
    labels: ['Leisurely', 'Steady', 'Relentless'],
    descriptions: [
      'Slow, contemplative, character-focused',
      'Good balance of action and breathing room',
      'Breakneck pace, constant momentum',
    ],
    isAdvanced: true,
  },
  {
    key: 'plotComplexity',
    label: 'Plot Complexity',
    description: 'How intricate the narrative threads are',
    labels: ['Streamlined', 'Balanced', 'Intricate'],
    descriptions: [
      'Clear single story thread to follow',
      'Multiple threads that weave together',
      'Complex, layered narrative structure',
    ],
    isAdvanced: true,
  },
  {
    key: 'characterDepth',
    label: 'Character Depth',
    description: 'Psychological complexity of characters',
    labels: ['Archetypal', 'Developed', 'Layered'],
    descriptions: [
      'Clear character types, easy to understand',
      'Characters with motivations and growth',
      'Complex psychology, hidden depths',
    ],
    isAdvanced: true,
  },
  {
    key: 'moralClarity',
    label: 'Moral Clarity',
    description: 'How clear right and wrong are',
    labels: ['Clear', 'Nuanced', 'Ambiguous'],
    descriptions: [
      'Good vs evil, heroes are heroic',
      'Shades of gray, understandable motivations',
      'Deliberately murky, no easy answers',
    ],
    isAdvanced: true,
  },
  {
    key: 'worldDetail',
    label: 'World Detail',
    description: 'Depth of setting and lore',
    labels: ['Minimal', 'Functional', 'Rich'],
    descriptions: [
      'Sketched setting, focus on characters',
      'Enough detail to feel real',
      'Deep lore, detailed world-building',
    ],
    isAdvanced: true,
  },
  {
    key: 'realism',
    label: 'Realism',
    description: 'How grounded in reality',
    labels: ['Fantastical', 'Grounded', 'Gritty'],
    descriptions: [
      'Dreamlike, magical logic allowed',
      'Believable within its genre',
      'Unflinching, documentary-like',
    ],
    isAdvanced: true,
  },
  {
    key: 'language',
    label: 'Language',
    description: 'Prose style and complexity',
    labels: ['Simple', 'Standard', 'Literary'],
    descriptions: [
      'Clear, accessible writing',
      'Well-crafted but not demanding',
      'Rich, evocative, literary prose',
    ],
    isAdvanced: true,
  },
  {
    key: 'actionVsDrama',
    label: 'Action vs Drama',
    description: 'Balance between action and character moments',
    labels: ['Action-heavy', 'Balanced', 'Drama-focused'],
    descriptions: [
      'Lots of exciting action sequences',
      'Mix of action and emotional beats',
      'Character relationships and emotions first',
    ],
    isAdvanced: true,
  },
  {
    key: 'mysteryDepth',
    label: 'Mystery Depth',
    description: 'Complexity of puzzles and secrets',
    labels: ['Light', 'Moderate', 'Complex'],
    descriptions: [
      'Straightforward, few surprises',
      'Some twists and things to figure out',
      'Deep mysteries, many layers to uncover',
    ],
    isAdvanced: true,
  },
];

// All sliders combined
export const ALL_SLIDERS = [...MAIN_SLIDERS, ...ADVANCED_SLIDERS];

// Get slider config by key
export function getSliderConfig(key: SliderKey): SliderConfig | undefined {
  return ALL_SLIDERS.find((s) => s.key === key);
}

// Convert slider value (1-5) to position index (0-2)
export function sliderValueToIndex(value: number): number {
  if (value <= 2) return 0;
  if (value >= 4) return 2;
  return 1;
}

// Convert position index (0-2) to slider value (1, 3, or 5)
export function indexToSliderValue(index: number): 1 | 3 | 5 {
  if (index === 0) return 1;
  if (index === 2) return 5;
  return 3;
}

// Count how many sliders are not 'auto'
export function countCustomSliders(sliders: StorySliders): number {
  return Object.values(sliders).filter((v) => v !== 'auto').length;
}
