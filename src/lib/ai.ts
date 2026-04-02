import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GardenConfig } from './config.js';

export interface AIResponse {
  text: string;
}

export interface AIResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// Global token counter for the current session
export const tokenUsage = { input: 0, output: 0 };

// Fast/cheap models for simple tasks like entity extraction
export const FAST_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  ollama: '', // keep user's choice
  'claude-cli': '',
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms / 1000}s: ${label}`)), ms)
    ),
  ]);
}

export async function callAI(config: GardenConfig, systemPrompt: string, userPrompt: string, modelOverride?: string): Promise<string> {
  const { provider } = config.ai;
  const model = modelOverride || config.ai.model;

  // Fall back to environment variable if config apiKey is not set
  const envKeys: Record<string, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  const apiKey = config.ai.apiKey || envKeys[provider];

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await withTimeout(
      client.messages.create({
        model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      120_000,
      `Anthropic ${model}`
    );
    tokenUsage.input += response.usage?.input_tokens || 0;
    tokenUsage.output += response.usage?.output_tokens || 0;
    const block = response.content[0];
    if (block.type === 'text') return block.text;
    throw new Error('Unexpected response type from Anthropic');
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    tokenUsage.input += response.usage?.prompt_tokens || 0;
    tokenUsage.output += response.usage?.completion_tokens || 0;
    return response.choices[0]?.message?.content || '';
  }

  if (provider === 'gemini') {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    tokenUsage.input += response.usage?.prompt_tokens || 0;
    tokenUsage.output += response.usage?.completion_tokens || 0;
    return response.choices[0]?.message?.content || '';
  }

  if (provider === 'ollama') {
    const client = new OpenAI({
      apiKey: 'ollama',
      baseURL: 'http://localhost:11434/v1/',
    });
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return response.choices[0]?.message?.content || '';
  }

  if (provider === 'claude-cli') {
    const { execFileSync } = await import('child_process');
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = execFileSync('claude', ['--print', fullPrompt], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

export async function callAIJson<T>(config: GardenConfig, systemPrompt: string, userPrompt: string, retries = 3, modelOverride?: string): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}\n\nYou MUST respond with valid JSON only. No markdown, no code blocks, no explanation. Just the JSON object.`;
  
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s...
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      }
      
      const response = await callAI(config, jsonSystemPrompt, userPrompt, modelOverride);
      
      // Try to extract JSON from response (in case LLM wraps it)
      let jsonStr = response.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      return JSON.parse(jsonStr) as T;
    } catch (err: any) {
      lastError = err;
    }
  }
  
  throw lastError || new Error('callAIJson failed after retries');
}
