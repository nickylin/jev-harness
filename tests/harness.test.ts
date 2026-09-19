import { describe, it, expect } from 'vitest';
import {
  createHarness,
  createMockEvaluate,
  createPolicy,
  booleanQuestion,
  choiceQuestion,
  allow,
  deny,
  route,
} from '../src';

describe('Harness', () => {
  it('should create a harness with default config', () => {
    const harness = createHarness();
    expect(harness).toBeDefined();
    expect(harness.listPolicies()).toEqual([]);
  });

  it('should register and retrieve policies', () => {
    const harness = createHarness();
    const policy = createPolicy({
      name: 'test-policy',
      questions: [booleanQuestion('is_valid', 'Is this valid?')],
      decide: (answers) => allow(answers),
    });

    harness.register(policy);

    expect(harness.listPolicies()).toEqual(['test-policy']);
    expect(harness.getPolicy('test-policy')).toBe(policy);
  });

  it('should evaluate a policy with mocked answers', async () => {
    const mockEvaluate = createMockEvaluate({ is_valid: true });
    const harness = createHarness({ evaluateFn: mockEvaluate });

    const policy = createPolicy({
      name: 'validation',
      questions: [booleanQuestion('is_valid', 'Is this valid?')],
      decide: (answers) => {
        if (answers.is_valid) {
          return allow(answers, { confidence: 1.0 });
        }
        return deny(answers, { confidence: 0.9 });
      },
    });

    harness.register(policy);
    const decision = await harness.evaluate({ data: 'test' }, 'validation');

    expect(decision.action).toBe('allow');
    expect(decision.confidence).toBe(1.0);
    expect(decision.answers.is_valid).toBe(true);
  });

  it('should throw when evaluating unknown policy', async () => {
    const harness = createHarness();

    await expect(harness.evaluate({}, 'unknown')).rejects.toThrow(
      'Policy not found: unknown'
    );
  });

  it('should evaluate multiple policies', async () => {
    const mockEvaluate = createMockEvaluate({
      category: 'bug',
      is_urgent: true,
    });
    const harness = createHarness({ evaluateFn: mockEvaluate });

    const categorizationPolicy = createPolicy({
      name: 'categorize',
      questions: [
        choiceQuestion('category', 'What category?', ['bug', 'feature', 'other']),
      ],
      decide: (answers) => route(answers, answers.category as string),
    });

    const urgencyPolicy = createPolicy({
      name: 'urgency',
      questions: [booleanQuestion('is_urgent', 'Is this urgent?')],
      decide: (answers) =>
        answers.is_urgent
          ? allow(answers, { confidence: 1.0 })
          : deny(answers, { confidence: 0.5 }),
    });

    harness.registerAll([categorizationPolicy, urgencyPolicy]);

    const results = await harness.evaluateAll({ text: 'crash' });

    expect(results.size).toBe(2);
    expect(results.get('categorize')?.route).toBe('bug');
    expect(results.get('urgency')?.action).toBe('allow');
  });

  it('should create harness with custom evaluate via withEvaluate', async () => {
    const harness = createHarness();
    const policy = createPolicy({
      name: 'test',
      questions: [booleanQuestion('flag', 'Test flag?')],
      decide: (answers) => (answers.flag ? allow(answers) : deny(answers)),
    });
    harness.register(policy);

    const customHarness = harness.withEvaluate(createMockEvaluate({ flag: true }));
    const decision = await customHarness.evaluate({}, 'test');

    expect(decision.action).toBe('allow');
  });
});
