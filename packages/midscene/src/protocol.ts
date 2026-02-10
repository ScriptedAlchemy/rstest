/**
 * Protocol types for @rstest/midscene AI integration
 */

/**
 * AI RPC methods supported by the host
 */
export type AiRpcMethod =
  | 'ai'
  | 'aiTap'
  | 'aiRightClick'
  | 'aiDoubleClick'
  | 'aiHover'
  | 'aiInput'
  | 'aiKeyboardPress'
  | 'aiScroll'
  | 'aiAct'
  | 'aiQuery'
  | 'aiAssert'
  | 'aiWaitFor'
  | 'aiLocate'
  | 'aiBoolean'
  | 'aiNumber'
  | 'aiString'
  | 'aiAsk'
  | 'runYaml'
  | 'setAIActContext'
  | 'evaluateJavaScript'
  | 'recordToReport'
  | 'freezePageContext'
  | 'unfreezePageContext'
  | '_unstableLogContent';

/**
 * AI RPC request from runner iframe to execute Midscene AI operations.
 */
export type AiRpcRequest = {
  id: string;
  /**
   * Runner instance identifier for stale-request protection.
   * Generated per iframe load/reload.
   */
  runId: string;
  method: AiRpcMethod;
  args: unknown[];
};

/**
 * AI RPC response from host to runner iframe.
 */
export type AiRpcResponse = {
  id: string;
  result?: unknown;
  error?: string;
};
