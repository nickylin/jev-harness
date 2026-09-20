import type {
  ProviderType,
  ProviderConfig,
  ResolvedProviderConfig,
  JevProvider,
} from './types';
import { PROVIDER_ENV_VARS, PROVIDER_DEFAULTS } from './types';
import { TypeSafeProvider, createTypeSafeProvider } from './typesafe';
import { VercelGatewayProvider, createVercelGatewayProvider } from './vercel-gateway';

export * from './types';
export { TypeSafeProvider, createTypeSafeProvider } from './typesafe';
export { VercelGatewayProvider, createVercelGatewayProvider } from './vercel-gateway';

/**
 * Auto-detect the best available provider based on environment variables
 * Priority: TYPESAFE_API_KEY > AI_GATEWAY_API_KEY
 */
export function detectProvider(): {
  provider: Exclude<ProviderType, 'auto'>;
  apiKey: string;
} | null {
  const typesafeKey = process.env[PROVIDER_ENV_VARS.typesafe];
  if (typesafeKey) {
    return { provider: 'typesafe', apiKey: typesafeKey };
  }

  const gatewayKey = process.env[PROVIDER_ENV_VARS['vercel-gateway']];
  if (gatewayKey) {
    return { provider: 'vercel-gateway', apiKey: gatewayKey };
  }

  return null;
}

/**
 * Resolve provider configuration with auto-detection
 */
export function resolveProviderConfig(
  config: Partial<ProviderConfig> = {}
): ResolvedProviderConfig {
  const requestedProvider = config.provider ?? 'auto';

  let resolvedProvider: Exclude<ProviderType, 'auto'>;
  let apiKey: string;

  if (requestedProvider === 'auto') {
    const detected = detectProvider();
    if (!detected) {
      throw new Error(
        'No Jev provider configured. Set TYPESAFE_API_KEY for TypeSafe official API, ' +
          'or AI_GATEWAY_API_KEY for Vercel AI Gateway, or pass apiKey in config.'
      );
    }
    resolvedProvider = detected.provider;
    apiKey = config.apiKey ?? detected.apiKey;
  } else {
    resolvedProvider = requestedProvider;
    const envKey = process.env[PROVIDER_ENV_VARS[resolvedProvider]];
    apiKey = config.apiKey ?? envKey ?? '';

    if (!apiKey) {
      throw new Error(
        `${PROVIDER_ENV_VARS[resolvedProvider]} is required for ${resolvedProvider} provider. ` +
          'Set it in environment or pass apiKey in config.'
      );
    }
  }

  const defaults = PROVIDER_DEFAULTS[resolvedProvider];

  return {
    provider: resolvedProvider,
    apiKey,
    baseURL: config.baseURL ?? defaults.baseURL,
    model: config.model ?? defaults.model,
  };
}

/**
 * Create a provider instance from resolved configuration
 */
export function createProvider(config: ResolvedProviderConfig): JevProvider {
  switch (config.provider) {
    case 'typesafe':
      return createTypeSafeProvider(config);
    case 'vercel-gateway':
      return createVercelGatewayProvider(config);
    default:
      throw new Error(`Unknown provider: ${(config as ResolvedProviderConfig).provider}`);
  }
}

/**
 * Create a provider instance with auto-detection
 */
export function createAutoProvider(
  config: Partial<ProviderConfig> = {}
): JevProvider {
  const resolved = resolveProviderConfig(config);
  return createProvider(resolved);
}

/**
 * Get provider info for the current configuration
 */
export function getProviderInfo(config: Partial<ProviderConfig> = {}): {
  provider: Exclude<ProviderType, 'auto'>;
  baseURL: string;
  model: string;
  envVar: string;
} {
  const resolved = resolveProviderConfig(config);
  return {
    provider: resolved.provider,
    baseURL: resolved.baseURL,
    model: resolved.model,
    envVar: PROVIDER_ENV_VARS[resolved.provider],
  };
}
