import type { EvaluationContext, Answers, Question } from '../types';

/**
 * Provider identifiers
 */
export type ProviderType = 'typesafe' | 'vercel-gateway' | 'auto';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider type */
  provider: ProviderType;
  /** API key (provider-specific env var used if not provided) */
  apiKey?: string;
  /** Base URL override */
  baseURL?: string;
  /** Model ID override */
  model?: string;
}

/**
 * Resolved provider configuration after auto-detection
 */
export interface ResolvedProviderConfig {
  provider: Exclude<ProviderType, 'auto'>;
  apiKey: string;
  baseURL: string;
  model: string;
}

/**
 * Provider interface for Jev backends
 */
export interface JevProvider {
  /** Provider name */
  readonly name: string;

  /** Evaluate questions against the provider's API */
  evaluate(context: EvaluationContext): Promise<Answers>;
}

/**
 * Question primitive names used by TypeSafe official API
 */
export type TypeSafeQuestionPrimitive = 'noul' | 'choice' | 'score';

/**
 * TypeSafe API request format
 */
export interface TypeSafeRequest {
  model: string;
  state: unknown;
  questions: TypeSafeQuestion[];
}

/**
 * TypeSafe question format (uses 'noul' instead of 'boolean')
 */
export interface TypeSafeQuestion {
  key: string;
  prompt: string;
  type: TypeSafeQuestionPrimitive;
  choices?: string[];
  min?: number;
  max?: number;
}

/**
 * TypeSafe API response format
 */
export interface TypeSafeResponse {
  answers: Record<string, TypeSafeAnswerValue>;
}

/**
 * TypeSafe answer value format
 * - noul: { probability: number } where probability is 0-1
 * - choice: string
 * - score: number
 */
export type TypeSafeAnswerValue =
  | { probability: number }
  | string
  | number;

/**
 * Mapping from library question types to TypeSafe primitives
 */
export const LIBRARY_TO_TYPESAFE_TYPE: Record<string, TypeSafeQuestionPrimitive> = {
  boolean: 'noul',
  choice: 'choice',
  score: 'score',
};

/**
 * Convert a library question to TypeSafe format
 */
export function toTypeSafeQuestion(q: Question): TypeSafeQuestion {
  const base: TypeSafeQuestion = {
    key: q.key,
    prompt: q.prompt,
    type: LIBRARY_TO_TYPESAFE_TYPE[q.type] ?? q.type as TypeSafeQuestionPrimitive,
  };

  if (q.type === 'choice') {
    base.choices = q.choices;
  } else if (q.type === 'score') {
    base.min = q.min;
    base.max = q.max;
  }

  return base;
}

/**
 * Normalize TypeSafe answer value to library format
 * - noul probability -> boolean (probability >= 0.5)
 * - Also stores raw probability as `${key}_probability` for advanced use
 */
export function normalizeTypeSafeAnswer(
  key: string,
  value: TypeSafeAnswerValue,
  questionType: string
): { normalized: boolean | string | number; probability?: number } {
  if (questionType === 'boolean' || questionType === 'noul') {
    if (typeof value === 'object' && value !== null && 'probability' in value) {
      const prob = value.probability;
      return { normalized: prob >= 0.5, probability: prob };
    }
    if (typeof value === 'number') {
      return { normalized: value >= 0.5, probability: value };
    }
    return { normalized: value === 'true' };
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return { normalized: value };
  }

  return { normalized: String(value) };
}

/**
 * Provider environment variable names
 */
export const PROVIDER_ENV_VARS = {
  typesafe: 'TYPESAFE_API_KEY',
  'vercel-gateway': 'AI_GATEWAY_API_KEY',
} as const;

/**
 * Provider default configurations
 */
export const PROVIDER_DEFAULTS = {
  typesafe: {
    baseURL: 'https://api.typesafe.ai/v1',
    model: 'jev-latest',
    endpoint: '/systemone',
  },
  'vercel-gateway': {
    baseURL: 'https://api.vercel.ai/v1',
    model: 'typesafe-ai/jev',
    endpoint: '/chat/completions',
  },
} as const;
