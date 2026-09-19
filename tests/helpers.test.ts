import { describe, it, expect } from 'vitest';
import {
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
} from '../src';

describe('Question Helpers', () => {
  it('should create boolean question', () => {
    const q = booleanQuestion('is_spam', 'Is this spam?');
    expect(q.type).toBe('boolean');
    expect(q.key).toBe('is_spam');
    expect(q.prompt).toBe('Is this spam?');
  });

  it('should create choice question', () => {
    const q = choiceQuestion('sentiment', 'What sentiment?', [
      'positive',
      'negative',
      'neutral',
    ]);
    expect(q.type).toBe('choice');
    expect(q.choices).toEqual(['positive', 'negative', 'neutral']);
  });

  it('should create score question with defaults', () => {
    const q = scoreQuestion('confidence', 'How confident?');
    expect(q.type).toBe('score');
    expect(q.min).toBeUndefined();
    expect(q.max).toBeUndefined();
  });

  it('should create score question with custom range', () => {
    const q = scoreQuestion('rating', 'Rate 1-5', { min: 1, max: 5 });
    expect(q.min).toBe(1);
    expect(q.max).toBe(5);
  });

  it('should create text question', () => {
    const q = textQuestion('reason', 'What is the reason?');
    expect(q.type).toBe('text');
  });
});

describe('Answer Helpers', () => {
  const answers = {
    is_valid: true,
    category: 'bug',
    confidence: 0.85,
    reason: 'test reason',
  };

  it('should get boolean value', () => {
    expect(getBoolean(answers, 'is_valid')).toBe(true);
    expect(getBoolean(answers, 'missing')).toBe(false);
  });

  it('should get choice value', () => {
    expect(getChoice(answers, 'category')).toBe('bug');
    expect(getChoice(answers, 'missing')).toBeUndefined();
  });

  it('should get score value', () => {
    expect(getScore(answers, 'confidence')).toBe(0.85);
    expect(getScore(answers, 'missing')).toBe(0);
  });

  it('should get text value', () => {
    expect(getText(answers, 'reason')).toBe('test reason');
    expect(getText(answers, 'missing')).toBe('');
  });

  it('should check threshold', () => {
    expect(meetsThreshold(answers, 'confidence', 0.8)).toBe(true);
    expect(meetsThreshold(answers, 'confidence', 0.9)).toBe(false);
    expect(meetsThreshold(answers, 'missing', 0.5)).toBe(false);
  });
});

describe('Decision Helpers', () => {
  const answers = { test: true };

  it('should create allow decision', () => {
    const d = allow(answers, { confidence: 0.9 });
    expect(d.action).toBe('allow');
    expect(d.confidence).toBe(0.9);
    expect(d.answers).toBe(answers);
  });

  it('should create deny decision', () => {
    const d = deny(answers);
    expect(d.action).toBe('deny');
  });

  it('should create defer decision', () => {
    const d = defer(answers, { meta: { reason: 'complex' } });
    expect(d.action).toBe('defer');
    expect(d.meta).toEqual({ reason: 'complex' });
  });

  it('should create route decision', () => {
    const d = route(answers, 'bug_handler');
    expect(d.action).toBe('route');
    expect(d.route).toBe('bug_handler');
  });
});

describe('DecisionBuilder', () => {
  it('should build decision fluently', () => {
    const answers = { flag: true };
    const d = decide(answers)
      .action('allow')
      .confidence(0.95)
      .meta({ source: 'test' })
      .build();

    expect(d.action).toBe('allow');
    expect(d.confidence).toBe(0.95);
    expect(d.meta).toEqual({ source: 'test' });
  });

  it('should build route decision', () => {
    const answers = { category: 'bug' };
    const d = decide(answers).routeTo('bug_handler').confidence(0.8).build();

    expect(d.action).toBe('route');
    expect(d.route).toBe('bug_handler');
  });
});
