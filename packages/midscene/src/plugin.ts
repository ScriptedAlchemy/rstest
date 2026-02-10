/**
 * pluginMidscene - RsbuildPlugin for Midscene AI testing integration
 *
 * This plugin registers a message handler with @rstest/browser to handle
 * Midscene AI operations (aiTap, aiInput, aiAssert, etc.) from test runner iframes.
 *
 * Usage:
 * ```ts
 * // rstest.config.ts
 * import { pluginMidscene } from '@rstest/midscene/plugin';
 *
 * export default {
 *   browser: {
 *     enabled: true,
 *   },
 *   plugins: [pluginMidscene()],
 * };
 * ```
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentOpt } from '@midscene/core';
import type { RsbuildPlugin } from '@rsbuild/core';
import type {
  PluginMessageContext,
  RstestBrowserExposedApi,
} from '@rstest/browser';

type MaybePromise<T> = T | Promise<T>;

/**
 * Host-side Midscene Agent options.
 *
 * These options are applied on the Node.js side when creating `new Agent(...)`.
 * Use this for non-serializable configuration such as `createOpenAIClient`,
 * model settings, cache strategy, and report behavior.
 */
export type MidsceneAgentOptions = AgentOpt;

export type MidsceneProfileMap = Record<string, MidsceneAgentOptions>;

export type MidsceneProfileResolver =
  | string
  | ((ctx: PluginMessageContext) => string | undefined);

/**
 * Plugin options for pluginMidscene
 */
export interface PluginMidsceneOptions {
  /**
   * Path to .env file for Midscene configuration.
   * Defaults to '.env' in the project root.
   */
  envPath?: string;

  /**
   * Static host-side defaults applied to every Midscene Agent.
   */
  agentOptions?: MidsceneAgentOptions;

  /**
   * Named host-side option sets.
   *
   * Use with `resolveProfile` to select a profile per test file/request.
   */
  profiles?: MidsceneProfileMap;

  /**
   * Resolves the active profile name.
   *
   * - If omitted and `profiles.default` exists, `default` is used.
   * - If a profile name is resolved but missing from `profiles`, an error is thrown.
   */
  resolveProfile?: MidsceneProfileResolver;

  /**
   * Dynamic host-side option resolver executed on Agent creation.
   *
   * This is useful for deriving options from `testFile`, project context, or env.
   */
  createAgentOptions?: (
    ctx: PluginMessageContext,
    profileName: string | undefined,
  ) => MaybePromise<MidsceneAgentOptions | undefined>;

  /**
   * Custom key for Midscene Agent instance cache.
   *
   * Default key: `${testFile}::${profileName ?? 'default'}`
   */
  getAgentCacheKey?: (
    ctx: PluginMessageContext,
    profileName: string | undefined,
  ) => string;
}

/**
 * Midscene plugin namespace identifier
 */
const MIDSCENE_NAMESPACE = 'midscene';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const mergeAgentOptions = (
  ...optionsList: Array<MidsceneAgentOptions | undefined>
): MidsceneAgentOptions | undefined => {
  let merged: MidsceneAgentOptions | undefined;

  for (const current of optionsList) {
    if (!current) {
      continue;
    }

    const prev = merged;
    merged = {
      ...(prev || {}),
      ...current,
    };

    if (isObject(prev?.modelConfig) && isObject(current.modelConfig)) {
      merged.modelConfig = {
        ...prev.modelConfig,
        ...current.modelConfig,
      };
    }
  }

  return merged;
};

const resolveProfileName = (
  options: PluginMidsceneOptions,
  ctx: PluginMessageContext,
): string | undefined => {
  if (typeof options.resolveProfile === 'string') {
    return options.resolveProfile;
  }

  if (typeof options.resolveProfile === 'function') {
    return options.resolveProfile(ctx);
  }

  if (options.profiles?.default) {
    return 'default';
  }

  return undefined;
};

/**
 * Create the Midscene RsbuildPlugin for rstest browser mode.
 *
 * This plugin:
 * 1. Loads .env file for Midscene API keys (OPENAI_API_KEY, etc.)
 * 2. Registers a message handler with @rstest/browser for AI operations
 * 3. Creates and caches Midscene Agents per test file
 */
export function pluginMidscene(
  options: PluginMidsceneOptions = {},
): RsbuildPlugin {
  return {
    name: 'rstest:midscene',
    setup(api) {
      // Use onAfterStartDevServer to register handler after browser infrastructure is ready
      api.onAfterStartDevServer(async () => {
        // Get the exposed API from @rstest/browser
        const browserApi =
          api.useExposed<RstestBrowserExposedApi>('rstest:browser');
        if (!browserApi) {
          console.warn(
            '[rstest:midscene] @rstest/browser exposed API not found. ' +
              'Make sure browser mode is enabled.',
          );
          return;
        }

        // Load .env file for Midscene configuration
        const projectRoot = api.context.rootPath;
        const envPath = options.envPath
          ? resolve(projectRoot, options.envPath)
          : resolve(projectRoot, '.env');

        if (existsSync(envPath)) {
          try {
            const dotenv = await import('dotenv');
            dotenv.config({ path: envPath });
            console.log(`[rstest:midscene] Loaded .env from ${envPath}`);
          } catch {
            // dotenv not available, continue without it
          }
        }

        // Cache for Midscene Agents per key (test file + profile by default)
        type MidsceneAgent = Record<string, (...args: unknown[]) => unknown>;
        type AgentCacheEntry = {
          agent: MidsceneAgent;
          updateBindings: (
            containerPage: import('playwright').Page,
            iframeElement: import('playwright').ElementHandle<HTMLIFrameElement>,
            frame: import('playwright').Frame,
          ) => void;
        };
        const agentCache = new Map<string, AgentCacheEntry>();

        const getProfileOptionsOrThrow = (
          profileName: string | undefined,
        ): MidsceneAgentOptions | undefined => {
          if (!profileName) {
            return undefined;
          }

          const profileOptions = options.profiles?.[profileName];
          if (profileOptions) {
            return profileOptions;
          }

          const availableProfiles = Object.keys(options.profiles || {});
          throw new Error(
            `[rstest:midscene] Unknown profile "${profileName}". ` +
              `Available profiles: ${availableProfiles.join(', ') || '(none)'}`,
          );
        };

        const getAgentCacheKey = (
          ctx: PluginMessageContext,
          profileName: string | undefined,
        ): string => {
          return (
            options.getAgentCacheKey?.(ctx, profileName) ||
            `${ctx.testFile}::${profileName || 'default'}`
          );
        };

        const resolveAgentOptions = async (
          ctx: PluginMessageContext,
          profileName: string | undefined,
        ): Promise<MidsceneAgentOptions | undefined> => {
          const profileOptions = getProfileOptionsOrThrow(profileName);
          const dynamicOptions = await options.createAgentOptions?.(
            ctx,
            profileName,
          );

          return mergeAgentOptions(
            options.agentOptions,
            profileOptions,
            dynamicOptions,
          );
        };

        // Helper to get or create an Agent for a test file/profile key
        const getOrCreateAgent = async (
          ctx: PluginMessageContext,
        ): Promise<MidsceneAgent> => {
          const testFile = ctx.testFile;
          const profileName = resolveProfileName(options, ctx);
          const agentCacheKey = getAgentCacheKey(ctx, profileName);
          const containerPage = ctx.getContainerPage();
          const iframeElement = await ctx.getIframeElementForTestFile(testFile);
          const frame = await ctx.getFrameForTestFile(testFile);

          const cached = agentCache.get(agentCacheKey);
          if (cached) {
            cached.updateBindings(containerPage, iframeElement, frame);
            return cached.agent;
          }

          // Dynamically import HostWebPage (moved to this package)
          const { HostWebPage } = await import('./hostWebPage.js');

          // Create HostWebPage for this iframe
          const hostWebPage = new HostWebPage(
            containerPage,
            iframeElement,
            frame,
          );

          // Ensure action space is built before creating the Agent
          await hostWebPage.ensureActionSpace();

          // Dynamically import @midscene/core Agent
          const { Agent } = await import('@midscene/core');

          const agentOptions = await resolveAgentOptions(ctx, profileName);

          // Create Agent with the HostWebPage
          const agent = agentOptions
            ? new Agent(hostWebPage as any, agentOptions)
            : new Agent(hostWebPage as any);
          const midsceneAgent = agent as unknown as MidsceneAgent;
          agentCache.set(agentCacheKey, {
            agent: midsceneAgent,
            updateBindings: hostWebPage.updateBindings.bind(hostWebPage),
          });

          return midsceneAgent;
        };

        // Register the message handler
        browserApi.registerPluginMessageHandler(async (ctx) => {
          const { message } = ctx;

          // Only handle messages for our namespace
          if (message.payload.namespace !== MIDSCENE_NAMESPACE) {
            return undefined;
          }

          const { request } = message.payload;
          const { id, method, args } = request;

          try {
            const agent = await getOrCreateAgent(ctx);
            const handler =
              method === 'ai' && typeof agent.ai !== 'function'
                ? agent.aiAct
                : method === 'setAIActContext' &&
                    typeof agent.setAIActContext !== 'function'
                  ? agent.setAIActionContext
                  : agent[method];
            if (typeof handler !== 'function') {
              throw new Error(`Unknown Midscene method: ${method}`);
            }
            const result = await Reflect.apply(
              handler as (...handlerArgs: unknown[]) => unknown,
              agent,
              args,
            );

            return {
              namespace: MIDSCENE_NAMESPACE,
              response: { id, result },
            };
          } catch (error) {
            return {
              namespace: MIDSCENE_NAMESPACE,
              response: {
                id,
                error: (error as Error).message,
              },
            };
          }
        });

        console.log('[rstest:midscene] Plugin initialized');
      });
    },
  };
}
