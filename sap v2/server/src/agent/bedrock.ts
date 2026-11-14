// Model adapters. The real one calls Claude on AWS Bedrock through the Converse API with tool use.
// Messages use the Converse content-block format everywhere, so the stub (stub.ts) is a drop-in.
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { step } from '../xray.ts';

export type Block =
  | { text: string }
  | { toolUse: { toolUseId: string; name: string; input: any } }
  | { toolResult: { toolUseId: string; content: { json: any }[]; status?: 'success' | 'error' } };
export type ChatMessage = { role: 'user' | 'assistant'; content: Block[] };
export type ToolSpec = { name: string; description: string; inputSchema: Record<string, unknown> };
export type Turn = { content: Block[]; text: string; toolCalls: { id: string; name: string; input: any }[]; stopReason: string; usage?: { inputTokens?: number; outputTokens?: number }; modelId: string };

export interface ModelAdapter {
  /** Reported by GET /api/config. */
  readonly id: string;
  readonly provider: string;
  readonly isBedrock: boolean;
  /** One model call. `ref` receives the X-ray step id so tool steps can nest under it. */
  converse(system: string, messages: ChatMessage[], tools: ToolSpec[], ref?: { stepId?: string }): Promise<Turn>;
  /**
   * One model call that must answer by calling `tool` (structured output). Used by the AI household
   * engine (brain/). Only real models implement it; the stub does not, so the engine falls back to rules.
   */
  structured?(system: string, messages: ChatMessage[], tool: ToolSpec, label: string): Promise<{ input: any; turn: Turn }>;
}

export const toTurn = (content: Block[], stopReason: string, modelId: string, usage?: Turn['usage']): Turn => ({
  content, stopReason, modelId, usage,
  text: content.flatMap((b) => ('text' in b ? [b.text] : [])).join('').trim(),
  toolCalls: content.flatMap((b) => ('toolUse' in b ? [{ id: b.toolUse.toolUseId, name: b.toolUse.name, input: b.toolUse.input ?? {} }] : [])),
});

/**
 * What Bedrock Converse rejects with a ValidationException: the first message is not from the user,
 * two messages in a row have the same role, an empty message, or a toolUse without its toolResult
 * in the next message (and the reverse).
 */
export function conversationProblems(messages: ChatMessage[]): string[] {
  const problems: string[] = [];
  const ids = (m: ChatMessage | undefined, kind: 'toolUse' | 'toolResult') =>
    (m?.content ?? []).flatMap((b) => (kind === 'toolUse' && 'toolUse' in b ? [b.toolUse.toolUseId] : kind === 'toolResult' && 'toolResult' in b ? [b.toolResult.toolUseId] : []));
  if (messages.length && messages[0].role !== 'user') problems.push('the first message is not from the user');
  messages.forEach((m, i) => {
    if (!m.content.length) problems.push(`message ${i} is empty`);
    if (i > 0 && messages[i - 1].role === m.role) problems.push(`messages ${i - 1} and ${i} are both ${m.role}`);
    if (m.role === 'assistant') for (const id of ids(m, 'toolUse')) if (!ids(messages[i + 1], 'toolResult').includes(id)) problems.push(`toolUse ${id} has no toolResult`);
    if (m.role === 'user') for (const id of ids(m, 'toolResult')) if (!ids(messages[i - 1], 'toolUse').includes(id)) problems.push(`toolResult ${id} has no toolUse`);
  });
  return problems;
}

const RETRY_WITH_FALLBACK = /Throttling|TooManyRequests|Timeout|ServiceUnavailable|ModelNotReady|InternalServer|AbortError|ECONNRESET|ETIMEDOUT/i;

export class BedrockModel implements ModelAdapter {
  readonly provider = 'AWS Bedrock';
  readonly isBedrock = true;
  readonly id: string;
  private readonly fallbackId?: string;
  private readonly client: BedrockRuntimeClient;
  private readonly timeoutMs: number;

  constructor(options: { modelId: string; fallbackModelId?: string; region?: string; timeoutMs?: number }) {
    this.id = options.modelId;
    this.fallbackId = options.fallbackModelId || undefined;
    this.timeoutMs = options.timeoutMs ?? 45_000;
    // Credentials come from the local AWS profile (AWS_PROFILE) through the default provider chain.
    this.client = new BedrockRuntimeClient({ region: options.region ?? process.env.AWS_REGION });
  }

  private async send(modelId: string, system: string, messages: ChatMessage[], tools: ToolSpec[], force?: string, anyTool = false): Promise<Turn> {
    const problems = conversationProblems(messages);
    if (problems.length) throw new Error(`invalid conversation, not sent to Bedrock: ${problems.join('; ')}`);
    const response = await this.client.send(new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: messages as any,
      ...(tools.length && { toolConfig: {
        tools: tools.map((t) => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.inputSchema as any } } })),
        ...(force && { toolChoice: anyTool ? { any: {} } : { tool: { name: force } } }),
      } }),
      inferenceConfig: { maxTokens: force ? 8000 : 1024, temperature: force ? 0 : 0.2 },
    }), { abortSignal: AbortSignal.timeout(force ? Math.max(this.timeoutMs, 120_000) : this.timeoutMs) });
    return toTurn((response.output?.message?.content ?? []) as Block[], response.stopReason ?? 'end_turn', modelId, response.usage);
  }

  private record(modelId: string, system: string, messages: ChatMessage[], tools: ToolSpec[], ref?: { stepId?: string }) {
    return step('model', 'Bedrock Converse', `aws-bedrock:${modelId}`, { modelId, system, messages, tools: tools.map((t) => t.name) },
      () => this.send(modelId, system, messages, tools), {
        ref,
        summary: (t) => (t.toolCalls.length ? `asked for ${t.toolCalls.map((c) => c.name).join(', ')}` : `replied (${t.text.length} chars)`),
        meta: (t) => ({ tokensIn: t.usage?.inputTokens, tokensOut: t.usage?.outputTokens }),
      });
  }

  async converse(system: string, messages: ChatMessage[], tools: ToolSpec[], ref?: { stepId?: string }): Promise<Turn> {
    try {
      return await this.record(this.id, system, messages, tools, ref);
    } catch (e) {
      const reason = `${(e as Error).name}: ${(e as Error).message}`;
      if (!this.fallbackId || !RETRY_WITH_FALLBACK.test(reason)) throw e;
      await step('guard', 'model_fallback', 'aws-bedrock:guard', { from: this.id, to: this.fallbackId, reason }, () => ({ switchedTo: this.fallbackId }),
        { summary: () => `primary model throttled or timed out, using ${this.fallbackId}` });
      return this.record(this.fallbackId, system, messages, tools, ref);
    }
  }

  async structured(system: string, messages: ChatMessage[], tool: ToolSpec, label: string): Promise<{ input: any; turn: Turn }> {
    const call = (modelId: string) => step('model', label, `aws-bedrock:${modelId}`, { modelId, system, messages, tool: tool.name },
      async () => {
        // Some models only accept "any tool" rather than a named tool; with one tool both force the same answer.
        try { return await this.send(modelId, system, messages, [tool], tool.name); } catch (e) {
          if (!/toolChoice|tool_choice|tool choice/i.test(String((e as Error).message))) throw e;
          return this.send(modelId, system, messages, [tool], tool.name, true);
        }
      }, {
        summary: (t) => `answered with ${t.toolCalls.map((c) => c.name).join(', ') || 'text'}`,
        meta: (t) => ({ tokensIn: t.usage?.inputTokens, tokensOut: t.usage?.outputTokens }),
      });
    // Up to two tries on the main model (some models occasionally answer in text), then the fallback model.
    const attempts = [this.id, this.id, ...(this.fallbackId ? [this.fallbackId] : [])];
    let lastError: Error | undefined;
    for (const modelId of attempts) {
      try {
        const turn = await call(modelId);
        const hit = turn.toolCalls.find((c) => c.name === tool.name);
        if (hit) return { input: hit.input, turn };
        lastError = new Error(`model did not call ${tool.name}`);
      } catch (e) {
        lastError = e as Error;
        if (!RETRY_WITH_FALLBACK.test(`${lastError.name}: ${lastError.message}`)) throw e;
      }
    }
    throw lastError!;
  }

  /** Bedrock hello-world: one tiny call, no tools. */
  async hello(): Promise<string> {
    return (await this.send(this.id, 'Reply with the single word OK.', [{ role: 'user', content: [{ text: 'Say OK' }] }], [])).text;
  }
}
