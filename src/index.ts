// Core exports
export { Harness, createHarness } from './harness';
export { definePolicy, createPolicy, PolicyBuilder } from './policy';
export { defaultEvaluate, createMockEvaluate, createFixtureEvaluate } from './evaluate';

// Helper exports
export {
  booleanQuestion,
  choiceQuestion,
  scoreQuestion,
  textQuestion,
  getBoolean,
  getChoice,
  getScore,
  getText,
  meetsThreshold,
  allow,
  deny,
  defer,
  route,
  decide,
  DecisionBuilder,
} from './helpers';

// Type exports
export type {
  Decision,
  DecisionAction,
  Policy,
  Question,
  QuestionType,
  BooleanQuestion,
  ChoiceQuestion,
  ScoreQuestion,
  TextQuestion,
  Answers,
  HarnessConfig,
  EvaluationContext,
  EvaluateFunction,
} from './types';

// Schema exports for validation
export {
  DecisionSchema,
  DecisionActionSchema,
  QuestionSchema,
  QuestionTypeSchema,
  BooleanQuestionSchema,
  ChoiceQuestionSchema,
  ScoreQuestionSchema,
  TextQuestionSchema,
  PolicySchema,
} from './types';

// Built-in policies
export { storeReviewTriage } from './policies/store-review-triage';
export type {
  StoreReviewState,
  StoreReviewRoute,
  StoreReviewMeta,
} from './policies/store-review-triage';
