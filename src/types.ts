import { z } from 'zod';

/**
 * Decision actions that a policy can return
 */
export type DecisionAction = 'allow' | 'deny' | 'defer' | 'route';

/**
 * The result of evaluating a policy
 */
export interface Decision<TMeta = unknown> {
  /** The action to take */
  action: DecisionAction;
  /** Target route when action is 'route' */
  route?: string;
  /** Confidence score 0-1 */
  confidence?: number;
  /** The answers from the evaluation */
  answers: Record<string, unknown>;
  /** Optional metadata from the policy */
  meta?: TMeta;
}

/**
 * Question types for policies
 */
export type QuestionType = 'boolean' | 'choice' | 'score' | 'text';

/**
 * Base question definition
 */
export interface BaseQuestion {
  /** Unique key for this question */
  key: string;
  /** Human-readable description for the evaluator */
  prompt: string;
}

/**
 * Boolean question (yes/no)
 */
export interface BooleanQuestion extends BaseQuestion {
  type: 'boolean';
}

/**
 * Multiple choice question
 */
export interface ChoiceQuestion extends BaseQuestion {
  type: 'choice';
  /** Available choices */
  choices: string[];
}

/**
 * Numeric score question
 */
export interface ScoreQuestion extends BaseQuestion {
  type: 'score';
  /** Minimum score (default: 0) */
  min?: number;
  /** Maximum score (default: 1) */
  max?: number;
}

/**
 * Free-text question
 */
export interface TextQuestion extends BaseQuestion {
  type: 'text';
}

/**
 * Union of all question types
 */
export type Question = BooleanQuestion | ChoiceQuestion | ScoreQuestion | TextQuestion;

/**
 * Answers map keyed by question key
 */
export type Answers = Record<string, boolean | string | number>;

/**
 * Policy definition
 */
export interface Policy<TState = unknown, TMeta = unknown> {
  /** Unique name for the policy */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Questions to ask the evaluator */
  questions: Question[];
  /** Decision function that receives answers and original state */
  decide: (answers: Answers, state: TState) => Decision<TMeta>;
}

/**
 * Harness configuration
 */
export interface HarnessConfig {
  /** Model ID (default: 'typesafe-ai/jev') */
  model?: string;
  /** API key (reads AI_GATEWAY_API_KEY by default) */
  apiKey?: string;
  /** Base URL for the AI Gateway */
  baseURL?: string;
  /** Custom evaluate function for testing/mocking */
  evaluateFn?: EvaluateFunction;
}

/**
 * Evaluation context passed to the evaluator
 */
export interface EvaluationContext {
  /** Serialized state being evaluated */
  state: unknown;
  /** Questions to answer */
  questions: Question[];
}

/**
 * Function signature for the evaluate implementation
 */
export type EvaluateFunction = (
  context: EvaluationContext,
  config: { model: string; apiKey?: string; baseURL?: string }
) => Promise<Answers>;

/**
 * Zod schemas for validation
 */
export const DecisionActionSchema = z.enum(['allow', 'deny', 'defer', 'route']);

export const DecisionSchema = z.object({
  action: DecisionActionSchema,
  route: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  answers: z.record(z.unknown()),
  meta: z.unknown().optional(),
});

export const QuestionTypeSchema = z.enum(['boolean', 'choice', 'score', 'text']);

export const BooleanQuestionSchema = z.object({
  type: z.literal('boolean'),
  key: z.string(),
  prompt: z.string(),
});

export const ChoiceQuestionSchema = z.object({
  type: z.literal('choice'),
  key: z.string(),
  prompt: z.string(),
  choices: z.array(z.string()).min(1),
});

export const ScoreQuestionSchema = z.object({
  type: z.literal('score'),
  key: z.string(),
  prompt: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const TextQuestionSchema = z.object({
  type: z.literal('text'),
  key: z.string(),
  prompt: z.string(),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  BooleanQuestionSchema,
  ChoiceQuestionSchema,
  ScoreQuestionSchema,
  TextQuestionSchema,
]);

export const PolicySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
  decide: z.function(),
});
