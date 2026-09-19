# Contributing to jev-harness

We welcome contributions! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/nickylin/jev-harness
cd jev-harness

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
src/
├── index.ts          # Main exports
├── types.ts          # TypeScript types and Zod schemas
├── harness.ts        # Harness class and createHarness
├── policy.ts         # Policy builder utilities
├── helpers.ts        # Question and decision helpers
├── evaluate.ts       # Evaluation function implementations
└── policies/
    ├── index.ts      # Policy exports
    └── store-review-triage.ts  # Built-in triage policy

tests/                # Test files
examples/             # Example CLI and fixtures
```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

## Adding a New Policy

1. Create a file in `src/policies/your-policy.ts`
2. Define your state type, questions, and decide function
3. Export from `src/policies/index.ts`
4. Add tests in `tests/your-policy.test.ts`
5. Document in README if it's a built-in policy

Example policy structure:

```typescript
import type { Policy, Answers, Decision } from '../types';
import { booleanQuestion, route } from '../helpers';

export interface YourState {
  // fields...
}

export const yourPolicy: Policy<YourState> = {
  name: 'your-policy',
  description: 'What it does',
  questions: [
    booleanQuestion('key', 'Question prompt?'),
  ],
  decide: (answers, state) => {
    // decision logic
    return route(answers, 'target');
  },
};
```

## Pull Request Guidelines

1. Create a branch from `main`
2. Write tests for new functionality
3. Ensure `pnpm build && pnpm test` passes
4. Update README if adding features
5. Use clear commit messages

## Code Style

- TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Use JSDoc comments for exported functions
- Keep functions small and focused

## Questions?

Open an issue for discussion before large changes.
