import type { EvaluationContext, Answers, Question } from '../types';
import type { JevProvider, ResolvedProviderConfig } from './types';
import { PROVIDER_DEFAULTS } from './types';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Build the evaluation prompt for the Vercel AI Gateway
 */
function buildPrompt(context: EvaluationContext): string {
  const lines: string[] = [
    'You are an evaluation assistant. Given the following state, answer each question precisely.',
    '',
    '## State',
    '```json',
    JSON.stringify(context.state, null, 2),
    '```',
    '',
    '## Questions',
    '',
  ];

  for (const q of context.questions) {
    lines.push(`### ${q.key}`);
    lines.push(q.prompt);

    switch (q.type) {
      case 'boolean':
        lines.push('Answer: true or false');
        break;
      case 'choice':
        lines.push(`Answer: one of [${(q.choices ?? []).join(', ')}]`);
        break;
      case 'score':
        const min = q.min ?? 0;
        const max = q.max ?? 1;
        lines.push(`Answer: a number between ${min} and ${max}`);
        break;
      case 'text':
        lines.push('Answer: a brief text response');
        break;
    }
    lines.push('');
  }

  lines.push('## Response Format');
  lines.push('Respond with a JSON object mapping each question key to its answer.');
  lines.push('Example: { "is_spam": false, "sentiment": "positive", "confidence": 0.85 }');

  return lines.join('\n');
}

/**
 * Parse the model response into answers
 */
function parseResponse(text: string, questions: Question[]): Answers {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse model response as JSON');
  }

  const raw = JSON.parse(jsonMatch[0]);
  const answers: Answers = {};

  for (const q of questions) {
    const value = raw[q.key];

    switch (q.type) {
      case 'boolean':
        answers[q.key] = value === true || value === 'true';
        break;
      case 'choice':
        answers[q.key] = String(value);
        break;
      case 'score':
        answers[q.key] = Number(value);
        break;
      case 'text':
        answers[q.key] = String(value ?? '');
        break;
    }
  }

  return answers;
}

/**
 * Vercel AI Gateway provider
 * Uses POST https://api.vercel.ai/v1/chat/completions
 * Model: typesafe-ai/jev
 * Auth: AI_GATEWAY_API_KEY or apiKey config
 */
export class VercelGatewayProvider implements JevProvider {
  readonly name = 'vercel-gateway';
  private config: ResolvedProviderConfig;

  constructor(config: ResolvedProviderConfig) {
    this.config = config;
  }

  async evaluate(context: EvaluationContext): Promise<Answers> {
    const { baseURL, model, apiKey } = this.config;
    const defaults = PROVIDER_DEFAULTS['vercel-gateway'];
    const endpoint = `${baseURL}${defaults.endpoint}`;

    const prompt = buildPrompt(context);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise evaluation assistant. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel AI Gateway error: ${response.status} - ${error}`);
    }

    const result = (await response.json()) as ChatCompletionResponse;
    const text = result.choices?.[0]?.message?.content ?? '';

    return parseResponse(text, context.questions);
  }
}

/**
 * Create a Vercel Gateway provider instance
 */
export function createVercelGatewayProvider(
  config: ResolvedProviderConfig
): VercelGatewayProvider {
  return new VercelGatewayProvider(config);
}
