import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GardenConfig } from './config.js';

export interface AIResponse {
  text: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms / 1000}s: ${label}`)), ms)
    ),
  ]);
}

export async function callAI(config: GardenConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const { provider, apiKey, model } = config.ai;

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
    return response.choices[0]?.message?.content || '';
  }

  if (provider === 'gemini') {
    // Gemini uses OpenAI-compatible API
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

export async function callAIJson<T>(config: GardenConfig, systemPrompt: string, userPrompt: string, retries = 3): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}\n\nYou MUST respond with valid JSON only. No markdown, no code blocks, no explanation. Just the JSON object.`;
  
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s...
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      }
      
      const response = await callAI(config, jsonSystemPrompt, userPrompt);
      
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
