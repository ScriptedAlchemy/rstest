/**
 * AgentProxy - Browser-side AI Agent API for @rstest/midscene
 *
 * All operations are forwarded to the host (Node.js) via plugin RPC, where the
 * real Midscene Agent instance executes them.
 */

import { sendAiRpcRequest } from './aiRpc';
import type { AiRpcMethod } from './protocol';

export interface PromptImage {
  name: string;
  url: string;
}

export type PromptInput =
  | string
  | {
      prompt: string;
      images?: PromptImage[];
      convertHttpImage2Base64?: boolean;
    };

export interface LocateActionOptions {
  deepThink?: boolean;
  xpath?: string;
  cacheable?: boolean;
}

export interface QueryOptions {
  domIncluded?: boolean | 'visible-only';
  screenshotIncluded?: boolean;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollOptions extends LocateActionOptions {
  scrollType?:
    | 'singleAction'
    | 'scrollToBottom'
    | 'scrollToTop'
    | 'scrollToRight'
    | 'scrollToLeft'
    | 'once'
    | 'untilBottom'
    | 'untilTop'
    | 'untilRight'
    | 'untilLeft';
  direction?: ScrollDirection;
  distance?: number | null;
}

export interface AiActOptions {
  cacheable?: boolean;
  deepThink?: 'unset' | boolean;
  fileChooserAccept?: string | string[];
}

export interface AiInputOptions extends LocateActionOptions {
  value: string | number;
  autoDismissKeyboard?: boolean;
  mode?: 'replace' | 'clear' | 'typeOnly';
}

export interface AiKeyboardPressOptions extends LocateActionOptions {
  keyName: string;
}

export interface AiWaitForOptions {
  timeoutMs?: number;
  checkIntervalMs?: number;
}

export interface RecordToReportOptions {
  content?: string;
}

export interface LocateResult {
  rect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  center?: [number, number];
  scale?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface RunYamlResult {
  result: unknown;
}

/**
 * AgentProxy class that forwards Midscene APIs to the host via RPC.
 */
export class AgentProxy {
  private async sendVoid(
    method: AiRpcMethod,
    args: unknown[] = [],
  ): Promise<void> {
    await sendAiRpcRequest<void>(method, args);
  }

  /** Alias of aiAct */
  async ai(prompt: string): Promise<void> {
    await this.sendVoid('ai', [prompt]);
  }

  async aiTap(
    locate: PromptInput,
    options?: LocateActionOptions,
  ): Promise<void> {
    await this.sendVoid(
      'aiTap',
      options === undefined ? [locate] : [locate, options],
    );
  }

  async aiRightClick(
    locate: PromptInput,
    options?: LocateActionOptions,
  ): Promise<void> {
    await this.sendVoid(
      'aiRightClick',
      options === undefined ? [locate] : [locate, options],
    );
  }

  async aiDoubleClick(
    locate: PromptInput,
    options?: LocateActionOptions,
  ): Promise<void> {
    await this.sendVoid(
      'aiDoubleClick',
      options === undefined ? [locate] : [locate, options],
    );
  }

  async aiHover(
    locate: PromptInput,
    options?: LocateActionOptions,
  ): Promise<void> {
    await this.sendVoid(
      'aiHover',
      options === undefined ? [locate] : [locate, options],
    );
  }

  /**
   * Supports both signatures:
   * - aiInput(locate, { value, ... })
   * - aiInput(locate, value, options?)
   */
  async aiInput(
    ...args:
      | [locate: PromptInput, opt: AiInputOptions]
      | [
          locate: PromptInput,
          value: string | number,
          options?: Omit<AiInputOptions, 'value'>,
        ]
  ): Promise<void> {
    if (typeof args[1] === 'object' && args[1] !== null) {
      await this.sendVoid('aiInput', [args[0], args[1]]);
      return;
    }

    const [locate, value, options] = args;
    const inputOptions: AiInputOptions = {
      ...(options || {}),
      value,
    };
    await this.sendVoid('aiInput', [locate, inputOptions]);
  }

  /**
   * Supports both signatures:
   * - aiKeyboardPress(locate, { keyName, ... })
   * - aiKeyboardPress(key, locate?, options?)
   */
  async aiKeyboardPress(
    ...args:
      | [locate: PromptInput, opt: AiKeyboardPressOptions]
      | [
          key: string,
          locate?: PromptInput,
          options?: Omit<AiKeyboardPressOptions, 'keyName'>,
        ]
  ): Promise<void> {
    await this.sendVoid('aiKeyboardPress', args as unknown[]);
  }

  /**
   * Supports both signatures:
   * - aiScroll(locate, options)
   * - aiScroll(scrollParam, locate?, options?)
   */
  async aiScroll(
    ...args:
      | [locate: PromptInput | undefined, opt: ScrollOptions]
      | [
          scrollParam: ScrollOptions,
          locate?: PromptInput,
          options?: LocateActionOptions,
        ]
  ): Promise<void> {
    await this.sendVoid('aiScroll', args as unknown[]);
  }

  async aiAct(prompt: string, options?: AiActOptions): Promise<void> {
    await this.sendVoid(
      'aiAct',
      options === undefined ? [prompt] : [prompt, options],
    );
  }

  async aiAsk(prompt: PromptInput, options?: QueryOptions): Promise<string> {
    return sendAiRpcRequest<string>(
      'aiAsk',
      options === undefined ? [prompt] : [prompt, options],
    );
  }

  async aiQuery<T = unknown>(
    dataDemand: PromptInput,
    options?: QueryOptions,
  ): Promise<T> {
    return sendAiRpcRequest<T>(
      'aiQuery',
      options === undefined ? [dataDemand] : [dataDemand, options],
    );
  }

  async aiAssert(
    assertion: PromptInput,
    errorMsgOrOptions?: string | QueryOptions,
    options?: QueryOptions,
  ): Promise<void> {
    if (typeof errorMsgOrOptions === 'string') {
      await this.sendVoid(
        'aiAssert',
        options === undefined
          ? [assertion, errorMsgOrOptions]
          : [assertion, errorMsgOrOptions, options],
      );
      return;
    }

    await this.sendVoid(
      'aiAssert',
      errorMsgOrOptions === undefined
        ? [assertion]
        : [assertion, undefined, errorMsgOrOptions],
    );
  }

  async aiWaitFor(
    condition: string,
    options?: AiWaitForOptions,
  ): Promise<void> {
    await this.sendVoid(
      'aiWaitFor',
      options === undefined ? [condition] : [condition, options],
    );
  }

  async aiLocate(
    locate: PromptInput,
    options?: LocateActionOptions,
  ): Promise<LocateResult> {
    return sendAiRpcRequest<LocateResult>(
      'aiLocate',
      options === undefined ? [locate] : [locate, options],
    );
  }

  async aiBoolean(
    prompt: PromptInput,
    options?: QueryOptions,
  ): Promise<boolean> {
    return sendAiRpcRequest<boolean>(
      'aiBoolean',
      options === undefined ? [prompt] : [prompt, options],
    );
  }

  async aiNumber(prompt: PromptInput, options?: QueryOptions): Promise<number> {
    return sendAiRpcRequest<number>(
      'aiNumber',
      options === undefined ? [prompt] : [prompt, options],
    );
  }

  async aiString(prompt: PromptInput, options?: QueryOptions): Promise<string> {
    return sendAiRpcRequest<string>(
      'aiString',
      options === undefined ? [prompt] : [prompt, options],
    );
  }

  async runYaml(yamlScriptContent: string): Promise<RunYamlResult> {
    return sendAiRpcRequest<RunYamlResult>('runYaml', [yamlScriptContent]);
  }

  async setAIActContext(aiActContext: string): Promise<void> {
    await this.sendVoid('setAIActContext', [aiActContext]);
  }

  async evaluateJavaScript(script: string): Promise<unknown> {
    return sendAiRpcRequest<unknown>('evaluateJavaScript', [script]);
  }

  async recordToReport(
    title?: string,
    options?: RecordToReportOptions,
  ): Promise<void> {
    const args: unknown[] = [];
    if (title !== undefined) {
      args.push(title);
    }
    if (options !== undefined) {
      if (title === undefined) {
        args.push(undefined);
      }
      args.push(options);
    }
    await this.sendVoid('recordToReport', args);
  }

  async freezePageContext(): Promise<void> {
    await this.sendVoid('freezePageContext');
  }

  async unfreezePageContext(): Promise<void> {
    await this.sendVoid('unfreezePageContext');
  }

  async _unstableLogContent(): Promise<unknown> {
    return sendAiRpcRequest<unknown>('_unstableLogContent', []);
  }
}

/** Default AgentProxy instance for convenient import. */
export const agent: AgentProxy = new AgentProxy();
