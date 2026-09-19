import type { StoreReviewState } from '../src';
import type { Answers } from '../src/types';

/**
 * Sample store reviews for testing
 */
export const sampleReviews: StoreReviewState[] = [
  {
    text: 'Love this app! It has completely changed how I organize my day. The interface is beautiful and intuitive.',
    stars: 5,
    reviewerId: 'user_001',
    appVersion: '2.1.0',
  },
  {
    text: 'App crashes every time I try to open the settings menu. Very frustrating. Please fix this bug!',
    stars: 2,
    reviewerId: 'user_002',
    appVersion: '2.0.9',
  },
  {
    text: 'Good app overall but it would be great if you could add dark mode. My eyes hurt at night.',
    stars: 4,
    reviewerId: 'user_003',
    appVersion: '2.1.0',
  },
  {
    text: 'asdfghjkl random text spam buy followers now click here',
    stars: 1,
    reviewerId: 'spam_bot_001',
    appVersion: '2.1.0',
  },
  {
    text: 'I was charged twice for my subscription and nobody is responding to my emails. This is unacceptable and I am considering legal action.',
    stars: 1,
    reviewerId: 'user_004',
    appVersion: '2.1.0',
  },
  {
    text: "It's okay I guess. Nothing special but it does what it says.",
    stars: 3,
    reviewerId: 'user_005',
    appVersion: '2.0.8',
  },
];

/**
 * Pre-defined answers for testing without API calls
 */
export const mockAnswers: Record<string, Answers> = {
  // Positive review
  'user_001': {
    sentiment: 'positive',
    is_bug_report: false,
    is_feature_request: false,
    contains_praise: true,
    needs_human: false,
    response_priority: 0.7,
    is_spam_or_irrelevant: false,
  },
  // Bug report
  'user_002': {
    sentiment: 'negative',
    is_bug_report: true,
    is_feature_request: false,
    contains_praise: false,
    needs_human: false,
    response_priority: 0.9,
    is_spam_or_irrelevant: false,
  },
  // Feature request
  'user_003': {
    sentiment: 'positive',
    is_bug_report: false,
    is_feature_request: true,
    contains_praise: true,
    needs_human: false,
    response_priority: 0.6,
    is_spam_or_irrelevant: false,
  },
  // Spam
  'spam_bot_001': {
    sentiment: 'neutral',
    is_bug_report: false,
    is_feature_request: false,
    contains_praise: false,
    needs_human: false,
    response_priority: 0.0,
    is_spam_or_irrelevant: true,
  },
  // Needs human (billing/legal)
  'user_004': {
    sentiment: 'negative',
    is_bug_report: false,
    is_feature_request: false,
    contains_praise: false,
    needs_human: true,
    response_priority: 1.0,
    is_spam_or_irrelevant: false,
  },
  // Neutral, low priority
  'user_005': {
    sentiment: 'neutral',
    is_bug_report: false,
    is_feature_request: false,
    contains_praise: false,
    needs_human: false,
    response_priority: 0.2,
    is_spam_or_irrelevant: false,
  },
};

/**
 * Get mock answers for a review by reviewer ID
 */
export function getAnswersForReview(review: StoreReviewState): Answers {
  return mockAnswers[review.reviewerId ?? ''] ?? {
    sentiment: 'neutral',
    is_bug_report: false,
    is_feature_request: false,
    contains_praise: false,
    needs_human: false,
    response_priority: 0.5,
    is_spam_or_irrelevant: false,
  };
}
