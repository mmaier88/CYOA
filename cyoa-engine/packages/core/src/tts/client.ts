import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Lazy-initialize ElevenLabs client
let _elevenlabs: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!_elevenlabs) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
    _elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return _elevenlabs;
}

// Default voice for story narration
export const DEFAULT_VOICE_ID = 'nPczCjzI2devNBz1zQrb';

// Available voices for story narration
export const STORY_VOICES = [
  {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Marcus',
    gender: 'male',
    description: 'Deep, engaging male voice - default narrator',
  },
  {
    id: 'dCnu06FiOZma2KVNUoPZ',
    name: 'Aurora',
    gender: 'female',
    description: 'Warm, expressive female voice - alternative narrator',
  },
] as const;

export type VoiceId = (typeof STORY_VOICES)[number]['id'];

/**
 * Preprocess text for TTS generation
 */
export function preprocessTextForTTS(text: string): string {
  return (
    text
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Convert em-dashes to spoken pause
      .replace(/—/g, ' — ')
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Normalize ellipsis
      .replace(/\.{3,}/g, '...')
      // Normalize multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Generate speech from text using ElevenLabs
 * Returns audio as a Buffer (MP3 format)
 */
export async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
  const cleanText = preprocessTextForTTS(text);

  if (!cleanText || cleanText.length === 0) {
    throw new Error('No text to generate speech from');
  }

  // ElevenLabs has a ~5000 character limit per request
  if (cleanText.length > 5000) {
    return generateSpeechChunked(cleanText, voiceId);
  }

  console.log('[TTS] Generating speech, text length:', cleanText.length);

  const audioStream = await getClient().textToSpeech.convert(voiceId, {
    text: cleanText,
    modelId: 'eleven_turbo_v2_5',
    outputFormat: 'mp3_44100_128',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    },
  });

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = audioStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  console.log('[TTS] Generated audio, size:', buffer.length);
  return buffer;
}

/**
 * Generate speech for long text by chunking
 */
async function generateSpeechChunked(
  text: string,
  voiceId: string
): Promise<Buffer> {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + '\n\n' + paragraph).length > 4800) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk
        ? currentChunk + '\n\n' + paragraph
        : paragraph;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log('[TTS] Generating chunked audio, chunks:', chunks.length);

  // Generate audio for each chunk
  const audioBuffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[TTS] Processing chunk ${i + 1}/${chunks.length}`);
    const audio = await generateSpeech(chunks[i], voiceId);
    audioBuffers.push(audio);
  }

  return Buffer.concat(audioBuffers);
}

/**
 * Estimate audio duration from text (rough approximation)
 * Average speaking rate: ~150 words per minute
 */
export function estimateDuration(text: string): number {
  const cleanText = preprocessTextForTTS(text);
  const wordCount = cleanText.split(/\s+/).length;
  return Math.ceil((wordCount / 150) * 60); // seconds
}

/**
 * Compute hash for cache key
 */
export function computeContentHash(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(text).digest('hex');
}
