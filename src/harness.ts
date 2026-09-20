import type {
  Policy,
  Decision,
  HarnessConfig,
  EvaluateFunction,
  EvaluationContext,
  Answers,
  ProviderType,
} from './types';
import {
  resolveProviderConfig,
  createProvider,
  type JevProvider,
  type ProviderConfig,
} from './providers';

/**
 * The Harness class manages policies and evaluates states against them
 */
export class Harness {
  private policies: Map<string, Policy> = new Map();
  private providerConfig: ProviderConfig;
  private provider: JevProvider | null = null;
  private evaluateFn: EvaluateFunction | null;

  constructor(config: HarnessConfig = {}) {
    this.providerConfig = {
      provider: config.provider ?? 'auto',
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    };
    this.evaluateFn = config.evaluateFn ?? null;
  }

  /**
   * Get or create the provider instance (lazy initialization)
   */
  private getProvider(): JevProvider {
    if (!this.provider) {
      const resolved = resolveProviderConfig(this.providerConfig);
      this.provider = createProvider(resolved);
    }
    return this.provider;
  }

  /**
   * Internal evaluate function that uses provider or custom evaluateFn
   */
  private async internalEvaluate(context: EvaluationContext): Promise<Answers> {
    if (this.evaluateFn) {
      return this.evaluateFn(context, {
        model: this.providerConfig.model ?? '',
        apiKey: this.providerConfig.apiKey,
        baseURL: this.providerConfig.baseURL,
      });
    }
    return this.getProvider().evaluate(context);
  }

  /**
   * Register a policy with the harness
   */
  register<TState = unknown, TMeta = unknown>(
    policy: Policy<TState, TMeta>
  ): this {
    this.policies.set(policy.name, policy as Policy);
    return this;
  }

  /**
   * Register multiple policies
   */
  registerAll(policies: Policy[]): this {
    for (const policy of policies) {
      this.register(policy);
    }
    return this;
  }

  /**
   * Get a registered policy by name
   */
  getPolicy(name: string): Policy | undefined {
    return this.policies.get(name);
  }

  /**
   * List all registered policy names
   */
  listPolicies(): string[] {
    return Array.from(this.policies.keys());
  }

  /**
   * Get the current provider type
   */
  getProviderType(): ProviderType {
    return this.providerConfig.provider;
  }

  /**
   * Evaluate a state against a named policy
   */
  async evaluate<TState = unknown, TMeta = unknown>(
    state: TState,
    policyName: string
  ): Promise<Decision<TMeta>> {
    const policy = this.policies.get(policyName) as Policy<TState, TMeta> | undefined;

    if (!policy) {
      throw new Error(`Policy not found: ${policyName}`);
    }

    const answers = await this.internalEvaluate({
      state,
      questions: policy.questions,
    });

    return policy.decide(answers, state);
  }

  /**
   * Evaluate a state against multiple policies
   */
  async evaluateAll<TState = unknown>(
    state: TState,
    policyNames?: string[]
  ): Promise<Map<string, Decision>> {
    const names = policyNames ?? this.listPolicies();
    const results = new Map<string, Decision>();

    await Promise.all(
      names.map(async (name) => {
        const decision = await this.evaluate(state, name);
        results.set(name, decision);
      })
    );

    return results;
  }

  /**
   * Create a new harness with a custom evaluate function
   * Useful for testing
   */
  withEvaluate(evaluateFn: EvaluateFunction): Harness {
    const harness = new Harness({
      provider: this.providerConfig.provider,
      model: this.providerConfig.model,
      apiKey: this.providerConfig.apiKey,
      baseURL: this.providerConfig.baseURL,
      evaluateFn,
    });

    for (const [name, policy] of this.policies) {
      harness.policies.set(name, policy);
    }

    return harness;
  }

  /**
   * Create a new harness with a different provider
   */
  withProvider(provider: ProviderType): Harness {
    const harness = new Harness({
      provider,
      model: this.providerConfig.model,
      apiKey: this.providerConfig.apiKey,
      baseURL: this.providerConfig.baseURL,
      evaluateFn: this.evaluateFn ?? undefined,
    });

    for (const [name, policy] of this.policies) {
      harness.policies.set(name, policy);
    }

    return harness;
  }
}

/**
 * Create a new harness instance
 */
export function createHarness(config: HarnessConfig = {}): Harness {
  return new Harness(config);
}
