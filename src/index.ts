// Core exports
export { Harness, createHarness } from './harness';
export { definePolicy, createPolicy, PolicyBuilder } from './policy';
export {
  defaultEvaluate,
  createMockEvaluate,
  createFixtureEvaluate,
  createTypeSafeMockEvaluate,
} from './evaluate';

// Provider exports
export {
  resolveProviderConfig,
  createProvider,
  createAutoProvider,
  detectProvider,
  getProviderInfo,
  TypeSafeProvider,
  VercelGatewayProvider,
  createTypeSafeProvider,
  createVercelGatewayProvider,
  toTypeSafeQuestion,
  normalizeTypeSafeAnswer,
  PROVIDER_ENV_VARS,
  PROVIDER_DEFAULTS,
  LIBRARY_TO_TYPESAFE_TYPE,
} from './providers';

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
  ProviderType,
} from './types';

// Provider type exports
export type {
  ProviderConfig,
  ResolvedProviderConfig,
  JevProvider,
  TypeSafeQuestionPrimitive,
  TypeSafeQuestion,
  TypeSafeRequest,
  TypeSafeResponse,
  TypeSafeAnswerValue,
} from './providers';

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
