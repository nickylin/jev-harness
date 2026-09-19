import type { Policy, Answers, Decision } from '../types';
import {
  booleanQuestion,
  choiceQuestion,
  scoreQuestion,
  getBoolean,
  getChoice,
  getScore,
  route,
  defer,
} from '../helpers';

/**
 * State for store review triage
 */
export interface StoreReviewState {
  /** The review text */
  text: string;
  /** Optional star rating (1-5) */
  stars?: number;
  /** Optional reviewer ID */
  reviewerId?: string;
  /** Optional app version */
  appVersion?: string;
}

/**
 * Routes for store review triage
 */
export type StoreReviewRoute =
  | 'thanks'
  | 'bug_ack'
  | 'feature_note'
  | 'skip'
  | 'defer_human';

/**
 * Metadata for store review decisions
 */
export interface StoreReviewMeta {
  /** Detected sentiment */
  sentiment: string;
  /** Whether the review contains actionable feedback */
  hasActionableFeedback: boolean;
  /** Original star rating if provided */
  originalStars?: number;
}

/**
 * Questions for store review analysis
 */
const questions = [
  choiceQuestion(
    'sentiment',
    'What is the overall sentiment of this review?',
    ['positive', 'neutral', 'negative', 'mixed']
  ),
  booleanQuestion(
    'is_bug_report',
    'Does the review report a bug or technical issue?'
  ),
  booleanQuestion(
    'is_feature_request',
    'Does the review request a new feature or improvement?'
  ),
  booleanQuestion(
    'contains_praise',
    'Does the review contain genuine praise or positive feedback?'
  ),
  booleanQuestion(
    'needs_human',
    'Does the review require human attention (complaints about billing, legal issues, safety concerns, or highly complex situations)?'
  ),
  scoreQuestion(
    'response_priority',
    'How important is it to respond to this review? (0 = not important, 1 = very important)',
    { min: 0, max: 1 }
  ),
  booleanQuestion(
    'is_spam_or_irrelevant',
    'Is the review spam, gibberish, or completely irrelevant?'
  ),
];

/**
 * Decision logic for store review triage
 */
function decide(answers: Answers, state: StoreReviewState): Decision<StoreReviewMeta> {
  const sentiment = getChoice(answers, 'sentiment') ?? 'neutral';
  const isBugReport = getBoolean(answers, 'is_bug_report');
  const isFeatureRequest = getBoolean(answers, 'is_feature_request');
  const containsPraise = getBoolean(answers, 'contains_praise');
  const needsHuman = getBoolean(answers, 'needs_human');
  const responsePriority = getScore(answers, 'response_priority');
  const isSpamOrIrrelevant = getBoolean(answers, 'is_spam_or_irrelevant');

  const meta: StoreReviewMeta = {
    sentiment,
    hasActionableFeedback: isBugReport || isFeatureRequest,
    originalStars: state.stars,
  };

  if (isSpamOrIrrelevant) {
    return route(answers, 'skip', { confidence: 0.9, meta });
  }

  if (needsHuman) {
    return defer(answers, { confidence: responsePriority, meta });
  }

  if (isBugReport) {
    return route(answers, 'bug_ack', {
      confidence: responsePriority,
      meta,
    });
  }

  if (isFeatureRequest) {
    return route(answers, 'feature_note', {
      confidence: responsePriority,
      meta,
    });
  }

  if (containsPraise || sentiment === 'positive') {
    return route(answers, 'thanks', {
      confidence: responsePriority,
      meta,
    });
  }

  if (responsePriority < 0.3) {
    return route(answers, 'skip', { confidence: 0.7, meta });
  }

  return route(answers, 'defer_human', { confidence: responsePriority, meta });
}

/**
 * Store review triage policy
 *
 * Analyzes app store reviews and routes them to appropriate responses:
 * - thanks: Positive reviews deserving thanks
 * - bug_ack: Bug reports that need acknowledgment
 * - feature_note: Feature requests to note
 * - skip: Spam or low-priority reviews
 * - defer_human: Complex situations needing human review
 */
export const storeReviewTriage: Policy<StoreReviewState, StoreReviewMeta> = {
  name: 'store-review-triage',
  description:
    'Triage app store reviews and route them to appropriate response handlers',
  questions,
  decide,
};
