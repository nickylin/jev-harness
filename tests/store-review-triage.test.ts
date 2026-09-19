import { describe, it, expect } from 'vitest';
import {
  createHarness,
  createMockEvaluate,
  storeReviewTriage,
} from '../src';
import type { StoreReviewState, StoreReviewMeta } from '../src';

describe('Store Review Triage Policy', () => {
  it('should route positive reviews to thanks', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'positive',
      is_bug_report: false,
      is_feature_request: false,
      contains_praise: true,
      needs_human: false,
      response_priority: 0.7,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'Amazing app! Love it!',
      stars: 5,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('route');
    expect(decision.route).toBe('thanks');
    expect(decision.meta?.sentiment).toBe('positive');
  });

  it('should route bug reports to bug_ack', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'negative',
      is_bug_report: true,
      is_feature_request: false,
      contains_praise: false,
      needs_human: false,
      response_priority: 0.9,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'App crashes when I open settings!',
      stars: 1,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('route');
    expect(decision.route).toBe('bug_ack');
    expect(decision.meta?.hasActionableFeedback).toBe(true);
  });

  it('should route feature requests to feature_note', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'positive',
      is_bug_report: false,
      is_feature_request: true,
      contains_praise: false,
      needs_human: false,
      response_priority: 0.6,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'Please add dark mode',
      stars: 4,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('route');
    expect(decision.route).toBe('feature_note');
  });

  it('should skip spam reviews', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'neutral',
      is_bug_report: false,
      is_feature_request: false,
      contains_praise: false,
      needs_human: false,
      response_priority: 0.0,
      is_spam_or_irrelevant: true,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'asdfghjkl buy followers',
      stars: 1,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('route');
    expect(decision.route).toBe('skip');
    expect(decision.confidence).toBe(0.9);
  });

  it('should defer billing/legal issues to human', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'negative',
      is_bug_report: false,
      is_feature_request: false,
      contains_praise: false,
      needs_human: true,
      response_priority: 1.0,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'I was charged twice and want a refund!',
      stars: 1,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('defer');
    expect(decision.confidence).toBe(1.0);
  });

  it('should skip low priority neutral reviews', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'neutral',
      is_bug_report: false,
      is_feature_request: false,
      contains_praise: false,
      needs_human: false,
      response_priority: 0.2,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'meh',
      stars: 3,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.action).toBe('route');
    expect(decision.route).toBe('skip');
  });

  it('should preserve original stars in meta', async () => {
    const mockEvaluate = createMockEvaluate({
      sentiment: 'positive',
      is_bug_report: false,
      is_feature_request: false,
      contains_praise: true,
      needs_human: false,
      response_priority: 0.8,
      is_spam_or_irrelevant: false,
    });

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const review: StoreReviewState = {
      text: 'Great!',
      stars: 5,
    };

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    expect(decision.meta?.originalStars).toBe(5);
  });
});
