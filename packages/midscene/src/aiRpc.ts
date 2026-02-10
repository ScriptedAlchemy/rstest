/**
 * AI RPC communication layer for @rstest/midscene
 *
 * This module handles the communication between the runner iframe and the
 * container/host for AI operations (aiTap, aiInput, aiAssert, etc.).
 *
 * Uses the generic plugin protocol with namespace 'midscene'.
 */

import type { AiRpcMethod, AiRpcRequest, AiRpcResponse } from './protocol';

/** Plugin namespace for midscene */
const MIDSCENE_NAMESPACE = 'midscene';

/** Pending request callback */
type PendingRequest = {
  resolve: (response: AiRpcResponse) => void;
  reject: (error: Error) => void;
};

/** Request counter for generating unique IDs */
let requestCounter = 0;

/** Map of pending requests by ID */
const pendingRequests = new Map<string, PendingRequest>();

/** Whether the RPC client is initialized */
let initialized = false;

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `ai-rpc-${++requestCounter}-${Date.now()}`;
}

/**
 * Initialize the AI RPC client.
 * This sets up the message listener for responses from the container.
 */
export function initAiRpc(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  window.addEventListener('message', (event: MessageEvent) => {
    // Listen for plugin response with midscene namespace
    if (event.data?.type === '__rstest_plugin_response__') {
      const { namespace, response } = event.data.payload as {
        namespace: string;
        response: AiRpcResponse;
      };
      // Only handle responses for our namespace
      if (namespace !== MIDSCENE_NAMESPACE) {
        return;
      }
      const pending = pendingRequests.get(response.id);
      if (pending) {
        pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response);
        }
      }
    }
  });
}

/**
 * Get the current test file from URL params
 */
function getTestFile(): string {
  const url = new URL(window.location.href);
  const testFile = url.searchParams.get('testFile');
  if (!testFile) {
    throw new Error(
      '@rstest/midscene: Cannot determine test file from URL. ' +
        'Make sure you are running in rstest browser mode.',
    );
  }
  return testFile;
}

/**
 * Get the current run ID from URL params.
 * runId changes on each iframe reload and is used for stale-request protection.
 */
function getRunId(): string {
  const url = new URL(window.location.href);
  const runId = url.searchParams.get('runId');
  if (!runId) {
    throw new Error(
      '@rstest/midscene: Cannot determine runId from URL. ' +
        'Make sure you are running with a compatible @rstest/browser version.',
    );
  }
  return runId;
}

/**
 * Send an AI RPC request to the container/host.
 * The container will forward it to the host via WebSocket RPC.
 *
 * @param method - The AI method to call (e.g., 'aiTap', 'aiInput')
 * @param args - Arguments for the method
 * @returns Promise that resolves with the result
 */
export function sendAiRpcRequest<T = unknown>(
  method: AiRpcMethod,
  args: unknown[],
): Promise<T> {
  // Ensure RPC is initialized
  initAiRpc();

  const id = generateRequestId();
  const testFile = getTestFile();
  const runId = getRunId();
  const request: AiRpcRequest = { id, runId, method, args };

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (response) => resolve(response.result as T),
      reject,
    });

    // Send via postMessage to parent (container) using generic plugin protocol
    window.parent.postMessage(
      {
        type: '__rstest_dispatch__',
        payload: {
          type: 'plugin',
          payload: {
            testFile,
            namespace: MIDSCENE_NAMESPACE,
            request,
          },
        },
      },
      '*',
    );

    // Set timeout for request (AI operations can take longer)
    setTimeout(
      () => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`AI RPC request timed out: ${method}`));
        }
      },
      120000, // 2 minutes timeout for AI operations
    );
  });
}
