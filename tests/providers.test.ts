import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toTypeSafeQuestion,
  normalizeTypeSafeAnswer,
  detectProvider,
  resolveProviderConfig,
  createProvider,
  PROVIDER_ENV_VARS,
  PROVIDER_DEFAULTS,
  LIBRARY_TO_TYPESAFE_TYPE,
  booleanQuestion,
  choiceQuestion,
  scoreQuestion,
} from '../src';

describe('Question Type Mapping', () => {
  describe('LIBRARY_TO_TYPESAFE_TYPE', () => {
    it('should map boolean to noul', () => {
      expect(LIBRARY_TO_TYPESAFE_TYPE.boolean).toBe('noul');
    });

    it('should map choice to choice', () => {
      expect(LIBRARY_TO_TYPESAFE_TYPE.choice).toBe('choice');
    });

    it('should map score to score', () => {
      expect(LIBRARY_TO_TYPESAFE_TYPE.score).toBe('score');
    });
  });

  describe('toTypeSafeQuestion', () => {
    it('should convert boolean question to noul', () => {
      const q = booleanQuestion('is_spam', 'Is this spam?');
      const result = toTypeSafeQuestion(q);

      expect(result.type).toBe('noul');
      expect(result.key).toBe('is_spam');
      expect(result.prompt).toBe('Is this spam?');
    });

    it('should preserve choice question with choices', () => {
      const q = choiceQuestion('sentiment', 'What sentiment?', ['positive', 'negative', 'neutral']);
      const result = toTypeSafeQuestion(q);

      expect(result.type).toBe('choice');
      expect(result.key).toBe('sentiment');
      expect(result.choices).toEqual(['positive', 'negative', 'neutral']);
    });

    it('should preserve score question with min/max', () => {
      const q = scoreQuestion('rating', 'Rate quality', { min: 0, max: 10 });
      const result = toTypeSafeQuestion(q);

      expect(result.type).toBe('score');
      expect(result.min).toBe(0);
      expect(result.max).toBe(10);
    });
  });
});

describe('Answer Normalization (noul → boolean)', () => {
  describe('normalizeTypeSafeAnswer', () => {
    it('should convert probability >= 0.5 to true', () => {
      const result = normalizeTypeSafeAnswer('key', { probability: 0.8 }, 'boolean');
      expect(result.normalized).toBe(true);
      expect(result.probability).toBe(0.8);
    });

    it('should convert probability < 0.5 to false', () => {
      const result = normalizeTypeSafeAnswer('key', { probability: 0.3 }, 'boolean');
      expect(result.normalized).toBe(false);
      expect(result.probability).toBe(0.3);
    });

    it('should handle probability exactly 0.5 as true', () => {
      const result = normalizeTypeSafeAnswer('key', { probability: 0.5 }, 'boolean');
      expect(result.normalized).toBe(true);
      expect(result.probability).toBe(0.5);
    });

    it('should handle numeric value as probability for boolean', () => {
      const result = normalizeTypeSafeAnswer('key', 0.7, 'boolean');
      expect(result.normalized).toBe(true);
      expect(result.probability).toBe(0.7);
    });

    it('should handle string "true" as true for boolean', () => {
      const result = normalizeTypeSafeAnswer('key', 'true', 'boolean');
      expect(result.normalized).toBe(true);
    });

    it('should handle string "false" as false for boolean', () => {
      const result = normalizeTypeSafeAnswer('key', 'false', 'boolean');
      expect(result.normalized).toBe(false);
    });

    it('should pass through choice values', () => {
      const result = normalizeTypeSafeAnswer('key', 'positive', 'choice');
      expect(result.normalized).toBe('positive');
      expect(result.probability).toBeUndefined();
    });

    it('should pass through score values', () => {
      const result = normalizeTypeSafeAnswer('key', 0.85, 'score');
      expect(result.normalized).toBe(0.85);
      expect(result.probability).toBeUndefined();
    });

    it('should work with noul type (alias for boolean)', () => {
      const result = normalizeTypeSafeAnswer('key', { probability: 0.9 }, 'noul');
      expect(result.normalized).toBe(true);
      expect(result.probability).toBe(0.9);
    });
  });
});

describe('Provider Detection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('detectProvider', () => {
    it('should return null when no API keys set', () => {
      const result = detectProvider();
      expect(result).toBeNull();
    });

    it('should prefer TYPESAFE_API_KEY when both set', () => {
      process.env.TYPESAFE_API_KEY = 'typesafe-key';
      process.env.AI_GATEWAY_API_KEY = 'gateway-key';

      const result = detectProvider();
      expect(result?.provider).toBe('typesafe');
      expect(result?.apiKey).toBe('typesafe-key');
    });

    it('should detect TYPESAFE_API_KEY', () => {
      process.env.TYPESAFE_API_KEY = 'typesafe-key';

      const result = detectProvider();
      expect(result?.provider).toBe('typesafe');
      expect(result?.apiKey).toBe('typesafe-key');
    });

    it('should detect AI_GATEWAY_API_KEY', () => {
      process.env.AI_GATEWAY_API_KEY = 'gateway-key';

      const result = detectProvider();
      expect(result?.provider).toBe('vercel-gateway');
      expect(result?.apiKey).toBe('gateway-key');
    });
  });

  describe('resolveProviderConfig', () => {
    it('should auto-detect provider from env', () => {
      process.env.TYPESAFE_API_KEY = 'typesafe-key';

      const result = resolveProviderConfig();
      expect(result.provider).toBe('typesafe');
      expect(result.apiKey).toBe('typesafe-key');
      expect(result.baseURL).toBe(PROVIDER_DEFAULTS.typesafe.baseURL);
      expect(result.model).toBe(PROVIDER_DEFAULTS.typesafe.model);
    });

    it('should use explicit provider config', () => {
      process.env.AI_GATEWAY_API_KEY = 'gateway-key';

      const result = resolveProviderConfig({ provider: 'vercel-gateway' });
      expect(result.provider).toBe('vercel-gateway');
      expect(result.baseURL).toBe(PROVIDER_DEFAULTS['vercel-gateway'].baseURL);
    });

    it('should allow baseURL override', () => {
      process.env.TYPESAFE_API_KEY = 'typesafe-key';

      const result = resolveProviderConfig({ baseURL: 'https://custom.api.com' });
      expect(result.baseURL).toBe('https://custom.api.com');
    });

    it('should allow model override', () => {
      process.env.TYPESAFE_API_KEY = 'typesafe-key';

      const result = resolveProviderConfig({ model: 'custom-model' });
      expect(result.model).toBe('custom-model');
    });

    it('should throw when no API key available for auto', () => {
      expect(() => resolveProviderConfig()).toThrow(
        /No Jev provider configured/
      );
    });

    it('should throw when explicit provider has no API key', () => {
      expect(() => resolveProviderConfig({ provider: 'typesafe' })).toThrow(
        /TYPESAFE_API_KEY is required/
      );
    });

    it('should use passed apiKey over env', () => {
      process.env.TYPESAFE_API_KEY = 'env-key';

      const result = resolveProviderConfig({
        provider: 'typesafe',
        apiKey: 'config-key',
      });
      expect(result.apiKey).toBe('config-key');
    });
  });

  describe('createProvider', () => {
    it('should create TypeSafe provider', () => {
      const config = {
        provider: 'typesafe' as const,
        apiKey: 'test-key',
        baseURL: 'https://api.typesafe.ai/v1',
        model: 'jev-latest',
      };

      const provider = createProvider(config);
      expect(provider.name).toBe('typesafe');
    });

    it('should create Vercel Gateway provider', () => {
      const config = {
        provider: 'vercel-gateway' as const,
        apiKey: 'test-key',
        baseURL: 'https://api.vercel.ai/v1',
        model: 'typesafe-ai/jev',
      };

      const provider = createProvider(config);
      expect(provider.name).toBe('vercel-gateway');
    });
  });
});

describe('Provider Defaults', () => {
  it('should have correct TypeSafe defaults', () => {
    expect(PROVIDER_DEFAULTS.typesafe.baseURL).toBe('https://api.typesafe.ai/v1');
    expect(PROVIDER_DEFAULTS.typesafe.model).toBe('jev-latest');
    expect(PROVIDER_DEFAULTS.typesafe.endpoint).toBe('/systemone');
  });

  it('should have correct Vercel Gateway defaults', () => {
    expect(PROVIDER_DEFAULTS['vercel-gateway'].baseURL).toBe('https://api.vercel.ai/v1');
    expect(PROVIDER_DEFAULTS['vercel-gateway'].model).toBe('typesafe-ai/jev');
    expect(PROVIDER_DEFAULTS['vercel-gateway'].endpoint).toBe('/chat/completions');
  });

  it('should have correct env var names', () => {
    expect(PROVIDER_ENV_VARS.typesafe).toBe('TYPESAFE_API_KEY');
    expect(PROVIDER_ENV_VARS['vercel-gateway']).toBe('AI_GATEWAY_API_KEY');
  });
});
