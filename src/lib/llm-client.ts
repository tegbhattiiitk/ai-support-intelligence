/**
 * LLM Client
 *
 * Provides GPT-4o-mini access via a configurable API proxy.
 * Set LLM_API_KEY in your .env.local to enable the AI chat feature.
 */

// ============================================================
// TYPES
// ============================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { url: string; mime_type: string };
}

export interface ChatParams {
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: {
    amount: number;
    currency: string;
    balance_remaining: number;
  };
}

export class LLMError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// ============================================================
// PLATFORM PROVIDER
// ============================================================

class PlatformProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com'
  ) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/llm/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-llm-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      })) as { message?: string; code?: string };
      throw new LLMError(
        error.message || 'LLM API request failed',
        error.code,
        response.status
      );
    }

    return response.json() as Promise<ChatResponse>;
  }
}

// ============================================================
// CLIENT WRAPPER
// ============================================================

export class LLMClient {
  constructor(private provider: PlatformProvider) {}

  chat(params: ChatParams): Promise<ChatResponse> {
    return this.provider.chat(params);
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createLLMClient(config?: {
  apiKey?: string;
  baseUrl?: string;
}): LLMClient {
  const apiKey = config?.apiKey || process.env.LLM_API_KEY;
  const baseUrl = config?.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com';

  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is required. This should be auto-configured in your .env file.'
    );
  }

  const provider = new PlatformProvider(apiKey, baseUrl);
  return new LLMClient(provider);
}
