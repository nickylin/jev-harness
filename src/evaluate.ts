import type { EvaluationContext, EvaluateFunction, Answers, Question } from './types';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Build the evaluation prompt for the model
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
 * Default evaluate function using AI SDK's experimental_evaluate pattern
 * Falls back to fetch-based implementation when AI SDK is not available
 */
export const defaultEvaluate: EvaluateFunction = async (context, config) => {
  const apiKey = config.apiKey ?? process.env.AI_GATEWAY_API_KEY;
  const baseURL = config.baseURL ?? 'https://api.vercel.ai/v1';

  if (!apiKey) {
    throw new Error(
      'AI_GATEWAY_API_KEY is required. Set it in environment or pass apiKey in config.'
    );
  }

  const prompt = buildPrompt(context);

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
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
    throw new Error(`AI Gateway error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ChatCompletionResponse;
  const text = result.choices?.[0]?.message?.content ?? '';

  return parseResponse(text, context.questions);
};

/**
 * Create a mock evaluate function for testing
 */
export function createMockEvaluate(mockAnswers: Answers): EvaluateFunction {
  return async () => mockAnswers;
}

/**
 * Create an evaluate function that returns pre-defined answers based on state
 */
export function createFixtureEvaluate(
  fixtures: Map<string, Answers> | Record<string, Answers>
): EvaluateFunction {
  const fixtureMap =
    fixtures instanceof Map ? fixtures : new Map(Object.entries(fixtures));

  return async (context) => {
    const stateKey = JSON.stringify(context.state);
    const answers = fixtureMap.get(stateKey);

    if (!answers) {
      throw new Error(`No fixture found for state: ${stateKey}`);
    }

    return answers;
  };
}
