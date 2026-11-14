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
}

export const toTurn = (content: Block[], stopReason: string, modelId: string, usage?: Turn['usage']): Turn => ({
  content, stopReason, modelId, usage,
  text: content.flatMap((b) => ('text' in b ? [b.text] : [])).join('').trim(),
  toolCalls: content.flatMap((b) => ('toolUse' in b ? [{ id: b.toolUse.toolUseId, name: b.toolUse.name, input: b.toolUse.input ?? {} }] : [])),
});

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

  private async send(modelId: string, system: string, messages: ChatMessage[], tools: ToolSpec[]): Promise<Turn> {
    const response = await this.client.send(new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: messages as any,
      ...(tools.length && { toolConfig: { tools: tools.map((t) => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.inputSchema as any } } })) } }),
      inferenceConfig: { maxTokens: 1024, temperature: 0.2 },
    }), { abortSignal: AbortSignal.timeout(this.timeoutMs) });
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

  /** Bedrock hello-world: one tiny call, no tools. */
  async hello(): Promise<string> {
    return (await this.send(this.id, 'Reply with the single word OK.', [{ role: 'user', content: [{ text: 'Say OK' }] }], [])).text;
  }
}
