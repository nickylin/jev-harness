import type { EvaluationContext, Answers, Question } from '../types';
import type {
  JevProvider,
  ResolvedProviderConfig,
  TypeSafeRequest,
  TypeSafeResponse,
  TypeSafeAnswerValue,
} from './types';
import {
  toTypeSafeQuestion,
  normalizeTypeSafeAnswer,
  PROVIDER_DEFAULTS,
} from './types';

/**
 * TypeSafe official provider
 * Uses POST https://api.typesafe.ai/v1/systemone
 * Model: jev-latest
 * Auth: TYPESAFE_API_KEY or apiKey config
 */
export class TypeSafeProvider implements JevProvider {
  readonly name = 'typesafe';
  private config: ResolvedProviderConfig;

  constructor(config: ResolvedProviderConfig) {
    this.config = config;
  }

  async evaluate(context: EvaluationContext): Promise<Answers> {
    const { baseURL, model, apiKey } = this.config;
    const defaults = PROVIDER_DEFAULTS.typesafe;
    const endpoint = `${baseURL}${defaults.endpoint}`;

    const request: TypeSafeRequest = {
      model,
      state: context.state,
      questions: context.questions.map(toTypeSafeQuestion),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TypeSafe API error: ${response.status} - ${error}`);
    }

    const result = (await response.json()) as TypeSafeResponse;
    return this.normalizeAnswers(result.answers, context.questions);
  }

  private normalizeAnswers(
    rawAnswers: Record<string, TypeSafeAnswerValue>,
    questions: Question[]
  ): Answers {
    const answers: Answers = {};
    const questionMap = new Map(questions.map((q) => [q.key, q.type]));

    for (const q of questions) {
      const rawValue = rawAnswers[q.key];
      if (rawValue === undefined) continue;

      const { normalized, probability } = normalizeTypeSafeAnswer(
        q.key,
        rawValue,
        q.type
      );

      answers[q.key] = normalized;

      if (probability !== undefined) {
        answers[`${q.key}_probability`] = probability;
      }
    }

    return answers;
  }
}

/**
 * Create a TypeSafe provider instance
 */
export function createTypeSafeProvider(
  config: ResolvedProviderConfig
): TypeSafeProvider {
  return new TypeSafeProvider(config);
}
