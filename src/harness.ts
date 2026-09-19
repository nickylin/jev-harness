import type {
  Policy,
  Decision,
  HarnessConfig,
  EvaluateFunction,
} from './types';
import { defaultEvaluate } from './evaluate';

const DEFAULT_MODEL = 'typesafe-ai/jev';

/**
 * The Harness class manages policies and evaluates states against them
 */
export class Harness {
  private policies: Map<string, Policy> = new Map();
  private model: string;
  private apiKey?: string;
  private baseURL?: string;
  private evaluateFn: EvaluateFunction;

  constructor(config: HarnessConfig = {}) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.evaluateFn = config.evaluateFn ?? defaultEvaluate;
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

    const answers = await this.evaluateFn(
      {
        state,
        questions: policy.questions,
      },
      {
        model: this.model,
        apiKey: this.apiKey,
        baseURL: this.baseURL,
      }
    );

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
      model: this.model,
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      evaluateFn,
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
