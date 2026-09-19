#!/usr/bin/env tsx
/**
 * Example CLI for jev-harness
 *
 * Usage:
 *   pnpm example                    # Run with mock data
 *   pnpm example --live             # Run with live Jev API (requires AI_GATEWAY_API_KEY)
 *   pnpm example --review "text"    # Evaluate a specific review
 */

import { createHarness, storeReviewTriage, createMockEvaluate } from '../src';
import type { StoreReviewState, Decision, StoreReviewMeta } from '../src';
import { sampleReviews, getAnswersForReview } from './fixtures';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatRoute(route: string): string {
  const colors: Record<string, string> = {
    thanks: COLORS.green,
    bug_ack: COLORS.yellow,
    feature_note: COLORS.blue,
    skip: COLORS.dim,
    defer_human: COLORS.red,
  };
  const color = colors[route] ?? COLORS.cyan;
  return `${color}${route}${COLORS.reset}`;
}

function printDecision(
  review: StoreReviewState,
  decision: Decision<StoreReviewMeta>
): void {
  console.log(
    `${COLORS.bright}Review:${COLORS.reset} "${review.text.substring(0, 60)}..."`
  );
  console.log(`  Stars: ${review.stars ?? 'N/A'}`);
  console.log(`  ${COLORS.bright}Route:${COLORS.reset} ${formatRoute(decision.route ?? decision.action)}`);
  console.log(
    `  Confidence: ${((decision.confidence ?? 0) * 100).toFixed(0)}%`
  );
  console.log(
    `  Sentiment: ${decision.meta?.sentiment ?? 'unknown'}`
  );
  console.log('');
}

async function runWithMocks(): Promise<void> {
  console.log(`${COLORS.bright}Running with mock evaluator${COLORS.reset}\n`);

  for (const review of sampleReviews) {
    const mockAnswers = getAnswersForReview(review);
    const mockEvaluate = createMockEvaluate(mockAnswers);

    const harness = createHarness({ evaluateFn: mockEvaluate });
    harness.register(storeReviewTriage);

    const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
      review,
      'store-review-triage'
    );

    printDecision(review, decision);
  }
}

async function runLive(reviewText?: string): Promise<void> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error(
      `${COLORS.red}Error: AI_GATEWAY_API_KEY is required for live mode${COLORS.reset}`
    );
    console.error('Set it in your environment or create a .env file');
    process.exit(1);
  }

  console.log(`${COLORS.bright}Running with live Jev API${COLORS.reset}\n`);

  const harness = createHarness();
  harness.register(storeReviewTriage);

  const reviews: StoreReviewState[] = reviewText
    ? [{ text: reviewText }]
    : sampleReviews.slice(0, 2); // Only run first 2 in live mode to save API calls

  for (const review of reviews) {
    try {
      const decision = await harness.evaluate<StoreReviewState, StoreReviewMeta>(
        review,
        'store-review-triage'
      );
      printDecision(review, decision);
    } catch (error) {
      console.error(
        `${COLORS.red}Error evaluating review:${COLORS.reset}`,
        error
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const reviewIndex = args.indexOf('--review');
  const customReview = reviewIndex !== -1 ? args[reviewIndex + 1] : undefined;

  console.log(`
${COLORS.cyan}╔═══════════════════════════════════════════╗
║     jev-harness Store Review Triage       ║
╚═══════════════════════════════════════════╝${COLORS.reset}
`);

  if (isLive) {
    await runLive(customReview);
  } else {
    await runWithMocks();
  }

  console.log(`${COLORS.dim}Done!${COLORS.reset}`);
}

main().catch(console.error);
