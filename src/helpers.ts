import type {
  BooleanQuestion,
  ChoiceQuestion,
  ScoreQuestion,
  TextQuestion,
  Answers,
  Decision,
  DecisionAction,
} from './types';

/**
 * Create a boolean (yes/no) question
 */
export function booleanQuestion(key: string, prompt: string): BooleanQuestion {
  return { type: 'boolean', key, prompt };
}

/**
 * Create a multiple choice question
 */
export function choiceQuestion(
  key: string,
  prompt: string,
  choices: string[]
): ChoiceQuestion {
  return { type: 'choice', key, prompt, choices };
}

/**
 * Create a numeric score question
 */
export function scoreQuestion(
  key: string,
  prompt: string,
  options: { min?: number; max?: number } = {}
): ScoreQuestion {
  return { type: 'score', key, prompt, min: options.min, max: options.max };
}

/**
 * Create a free-text question
 */
export function textQuestion(key: string, prompt: string): TextQuestion {
  return { type: 'text', key, prompt };
}

/**
 * Get a boolean answer, defaulting to false
 */
export function getBoolean(answers: Answers, key: string): boolean {
  const value = answers[key];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Get a choice answer
 */
export function getChoice(answers: Answers, key: string): string | undefined {
  const value = answers[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Get a score answer, defaulting to 0
 */
export function getScore(answers: Answers, key: string): number {
  const value = answers[key];
  return typeof value === 'number' ? value : 0;
}

/**
 * Get a text answer
 */
export function getText(answers: Answers, key: string): string {
  const value = answers[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Check if a score meets a probability threshold
 */
export function meetsThreshold(
  answers: Answers,
  key: string,
  threshold: number
): boolean {
  return getScore(answers, key) >= threshold;
}

/**
 * Create a simple allow decision
 */
export function allow<TMeta = unknown>(
  answers: Answers,
  options: { confidence?: number; meta?: TMeta } = {}
): Decision<TMeta> {
  return {
    action: 'allow',
    answers,
    confidence: options.confidence,
    meta: options.meta,
  };
}

/**
 * Create a simple deny decision
 */
export function deny<TMeta = unknown>(
  answers: Answers,
  options: { confidence?: number; meta?: TMeta } = {}
): Decision<TMeta> {
  return {
    action: 'deny',
    answers,
    confidence: options.confidence,
    meta: options.meta,
  };
}

/**
 * Create a defer decision (escalate to human)
 */
export function defer<TMeta = unknown>(
  answers: Answers,
  options: { confidence?: number; meta?: TMeta } = {}
): Decision<TMeta> {
  return {
    action: 'defer',
    answers,
    confidence: options.confidence,
    meta: options.meta,
  };
}

/**
 * Create a route decision
 */
export function route<TMeta = unknown>(
  answers: Answers,
  target: string,
  options: { confidence?: number; meta?: TMeta } = {}
): Decision<TMeta> {
  return {
    action: 'route',
    route: target,
    answers,
    confidence: options.confidence,
    meta: options.meta,
  };
}

/**
 * Decision builder for fluent API
 */
export class DecisionBuilder<TMeta = unknown> {
  private _action: DecisionAction = 'allow';
  private _route?: string;
  private _confidence?: number;
  private _answers: Answers;
  private _meta?: TMeta;

  constructor(answers: Answers) {
    this._answers = answers;
  }

  action(action: DecisionAction): this {
    this._action = action;
    return this;
  }

  routeTo(target: string): this {
    this._action = 'route';
    this._route = target;
    return this;
  }

  confidence(value: number): this {
    this._confidence = value;
    return this;
  }

  meta(value: TMeta): this {
    this._meta = value;
    return this;
  }

  build(): Decision<TMeta> {
    return {
      action: this._action,
      route: this._route,
      answers: this._answers,
      confidence: this._confidence,
      meta: this._meta,
    };
  }
}

/**
 * Start building a decision
 */
export function decide<TMeta = unknown>(answers: Answers): DecisionBuilder<TMeta> {
  return new DecisionBuilder<TMeta>(answers);
}
