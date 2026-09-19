# jev-harness

Typed decision control plane for agents, powered by TypeSafe AI's [Jev](https://typesafe.ai) via Vercel AI Gateway.

![Architecture overview](docs/architecture.png)

## Why jev-harness?

Agent frameworks often struggle with structured decision-making. Raw LLM JSON output is unpredictable—schemas drift, confidence scores vary, and routing logic scatters across prompts. **jev-harness** solves this by:

- **Typed questions**: Define exactly what you need answered (boolean, choice, score, text)
- **Typed decisions**: Get back `allow`, `deny`, `defer`, or `route` with confidence scores and metadata
- **Policy-driven**: Bundle questions + decision logic into reusable, testable policies
- **Mock-friendly**: Swap in `createMockEvaluate()` for deterministic unit tests—no API calls needed

## Installation

```bash
npm install jev-harness
# or
pnpm add jev-harness
```

**Peer dependency:** Requires `ai >= 3.0.0` for AI Gateway integration.

## Quick Start: Store Review Triage

![Store review triage flow](docs/usage-store-review-triage.png)

Triage app store reviews into response queues with the built-in `storeReviewTriage` policy:

```typescript
import { createHarness, storeReviewTriage, createMockEvaluate } from 'jev-harness';

// Create harness and register the built-in policy
const harness = createHarness();
harness.register(storeReviewTriage);

// Evaluate a review
const decision = await harness.evaluate(
  {
    text: "Love the app but it crashes on startup",
    stars: 4,
  },
  'store-review-triage'
);

console.log(decision.action);     // 'route'
console.log(decision.route);      // 'bug_ack'
console.log(decision.confidence); // 0.9
console.log(decision.meta);       // { sentiment: 'negative', hasActionableFeedback: true, originalStars: 4 }
```

### Store Review Triage Routes

| Route | When Matched | Suggested Action |
|-------|--------------|------------------|
| `thanks` | Positive reviews with genuine praise | Send thank-you response |
| `bug_ack` | Bug reports or technical issues | Acknowledge and create ticket |
| `feature_note` | Feature requests or suggestions | Log for product review |
| `skip` | Spam, gibberish, or irrelevant content | No response needed |
| `defer_human` | Billing disputes, legal threats, complex issues | Escalate to human support |

## Defining Custom Policies

Create policies using the fluent `definePolicy()` builder or the inline `createPolicy()` function:

```typescript
import {
  definePolicy,
  booleanQuestion,
  choiceQuestion,
  scoreQuestion,
  allow,
  deny,
  route,
} from 'jev-harness';

const contentModerationPolicy = definePolicy('content-moderation')
  .description('Moderate user-generated content')
  .question(booleanQuestion('is_spam', 'Is this content spam or promotional?'))
  .question(booleanQuestion('is_harmful', 'Does this contain harmful or abusive content?'))
  .question(choiceQuestion('category', 'Content category?', ['discussion', 'question', 'announcement', 'other']))
  .question(scoreQuestion('quality', 'Content quality score', { min: 0, max: 1 }))
  .decide((answers, state) => {
    if (answers.is_harmful) {
      return deny(answers, { confidence: 0.95 });
    }
    if (answers.is_spam) {
      return deny(answers, { confidence: 0.8 });
    }
    if (answers.quality < 0.3) {
      return route(answers, 'review-queue', { confidence: 0.7 });
    }
    return allow(answers, { confidence: answers.quality });
  })
  .build();

// Or use createPolicy() for simpler inline definitions
import { createPolicy } from 'jev-harness';

const simplePolicy = createPolicy({
  name: 'approval-gate',
  questions: [booleanQuestion('approved', 'Should this be approved?')],
  decide: (answers) => answers.approved ? allow(answers) : deny(answers),
});
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Your Agent / App                         │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ state
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                           jev-harness                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   Harness   │───▶│   Policy    │───▶│  Typed Questions    │   │
│  │  .evaluate()│    │  .decide()  │    │  boolean/choice/... │   │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   │ questions + state
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              Jev (via AI Gateway / Vercel AI SDK)                │
│                    model: typesafe-ai/jev                        │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   │ answers (typed)
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Decision                                 │
│        { action, route?, confidence, answers, meta? }            │
│                 allow | deny | defer | route                     │
└──────────────────────────────────────────────────────────────────┘
```

See `docs/architecture.png` for the visual diagram.

## Testing with Mocks

Replace the AI evaluator with deterministic mocks for unit testing:

```typescript
import { createHarness, createMockEvaluate, createFixtureEvaluate, storeReviewTriage } from 'jev-harness';

// Option 1: Static mock answers
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

const decision = await harness.evaluate(
  { text: 'Great app!', stars: 5 },
  'store-review-triage'
);
expect(decision.route).toBe('thanks');

// Option 2: Fixture-based answers (different answers per input state)
const fixtureEvaluate = createFixtureEvaluate({
  '{"text":"bug here","stars":2}': {
    sentiment: 'negative',
    is_bug_report: true,
    is_feature_request: false,
    contains_praise: false,
    needs_human: false,
    response_priority: 0.9,
    is_spam_or_irrelevant: false,
  },
});

const fixtureHarness = createHarness({ evaluateFn: fixtureEvaluate });
fixtureHarness.register(storeReviewTriage);

// Option 3: Swap evaluator on existing harness
const testHarness = harness.withEvaluate(createMockEvaluate({ is_spam_or_irrelevant: true }));
```

## API Reference

### Harness

```typescript
import { createHarness, Harness } from 'jev-harness';

// Create with factory function (recommended)
const harness = createHarness(config?: HarnessConfig);

// Or use constructor directly
const harness = new Harness(config?: HarnessConfig);

// HarnessConfig options
interface HarnessConfig {
  model?: string;           // Default: 'typesafe-ai/jev'
  apiKey?: string;          // Default: process.env.AI_GATEWAY_API_KEY
  baseURL?: string;         // Default: 'https://api.vercel.ai/v1'
  evaluateFn?: EvaluateFunction;  // Custom evaluator for testing
}

// Methods
harness.register(policy);              // Register a policy
harness.registerAll([policy1, ...]);   // Register multiple policies
harness.getPolicy(name);               // Get policy by name
harness.listPolicies();                // List registered policy names
harness.evaluate(state, policyName);   // Evaluate state against policy
harness.evaluateAll(state, names?);    // Evaluate against multiple policies
harness.withEvaluate(fn);              // Clone with custom evaluator
```

### Question Helpers

```typescript
import {
  booleanQuestion,
  choiceQuestion,
  scoreQuestion,
  textQuestion,
} from 'jev-harness';

booleanQuestion('key', 'Prompt?');                           // Yes/no
choiceQuestion('key', 'Which one?', ['a', 'b', 'c']);       // Multiple choice
scoreQuestion('key', 'Rate 0-1', { min: 0, max: 1 });       // Numeric score
textQuestion('key', 'Describe...');                          // Free text
```

### Answer Accessors

```typescript
import { getBoolean, getChoice, getScore, getText, meetsThreshold } from 'jev-harness';

const flag = getBoolean(answers, 'is_valid');        // boolean (default: false)
const category = getChoice(answers, 'category');     // string | undefined
const score = getScore(answers, 'confidence');       // number (default: 0)
const desc = getText(answers, 'description');        // string (default: '')
const passes = meetsThreshold(answers, 'score', 0.7); // boolean
```

### Decision Builders

```typescript
import { allow, deny, defer, route, decide } from 'jev-harness';

// Simple decisions
allow(answers, { confidence: 0.9, meta: { reason: 'valid' } });
deny(answers, { confidence: 0.8 });
defer(answers);  // Escalate to human
route(answers, 'target-queue', { confidence: 0.85 });

// Fluent builder
decide(answers)
  .routeTo('review-queue')
  .confidence(0.75)
  .meta({ flagged: true })
  .build();
```

### Types

```typescript
import type {
  Decision,
  DecisionAction,      // 'allow' | 'deny' | 'defer' | 'route'
  Policy,
  Question,
  BooleanQuestion,
  ChoiceQuestion,
  ScoreQuestion,
  TextQuestion,
  Answers,
  HarnessConfig,
  EvaluationContext,
  EvaluateFunction,
} from 'jev-harness';

// Built-in policy types
import type {
  StoreReviewState,
  StoreReviewRoute,
  StoreReviewMeta,
} from 'jev-harness';
```

### Zod Schemas

For runtime validation:

```typescript
import {
  DecisionSchema,
  PolicySchema,
  QuestionSchema,
  BooleanQuestionSchema,
  ChoiceQuestionSchema,
  ScoreQuestionSchema,
  TextQuestionSchema,
} from 'jev-harness';
```

## CLI Example

Run the included example to see store review triage in action:

```bash
# With mock evaluator (no API key needed)
pnpm example

# With live Jev API
AI_GATEWAY_API_KEY=your-key pnpm example --live

# Evaluate a custom review
pnpm example --review "This app is amazing but needs dark mode"
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_GATEWAY_API_KEY` | API key for Vercel AI Gateway | Required for live evaluation |

### `.env.example`

```bash
AI_GATEWAY_API_KEY=your-api-key-here
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
