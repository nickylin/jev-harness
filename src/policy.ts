import type { Policy, Question, Answers, Decision } from './types';

/**
 * Policy builder for fluent API
 */
export class PolicyBuilder<TState = unknown, TMeta = unknown> {
  private _name: string;
  private _description?: string;
  private _questions: Question[] = [];
  private _decide?: (answers: Answers, state: TState) => Decision<TMeta>;

  constructor(name: string) {
    this._name = name;
  }

  /**
   * Set the policy description
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Add a question to the policy
   */
  question(q: Question): this {
    this._questions.push(q);
    return this;
  }

  /**
   * Add multiple questions
   */
  questions(qs: Question[]): this {
    this._questions.push(...qs);
    return this;
  }

  /**
   * Set the decide function
   */
  decide(fn: (answers: Answers, state: TState) => Decision<TMeta>): this {
    this._decide = fn;
    return this;
  }

  /**
   * Build the policy
   */
  build(): Policy<TState, TMeta> {
    if (!this._decide) {
      throw new Error('Policy must have a decide function');
    }

    if (this._questions.length === 0) {
      throw new Error('Policy must have at least one question');
    }

    return {
      name: this._name,
      description: this._description,
      questions: this._questions,
      decide: this._decide,
    };
  }
}

/**
 * Start building a policy
 */
export function definePolicy<TState = unknown, TMeta = unknown>(
  name: string
): PolicyBuilder<TState, TMeta> {
  return new PolicyBuilder<TState, TMeta>(name);
}

/**
 * Create a simple policy inline
 */
export function createPolicy<TState = unknown, TMeta = unknown>(
  config: Policy<TState, TMeta>
): Policy<TState, TMeta> {
  return config;
}
