import { SPEECH_TO_TEXT_SYSTEM_PROMPT } from './sttPrompt';
import { RECEIPT_VISION_PROMPT } from './visionPrompt';
import { AI_TOOLS_DECLARATIONS } from './tools';
import { ReceiptScanResult } from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash-lite';

export class GeminiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async transcribeAudioBase64(audioBase64: string, mimeType = 'audio/m4a'): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Clé API Gemini non configurée. Veuillez renseigner votre clé dans les paramètres.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SPEECH_TO_TEXT_SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              { text: "Transcris cet enregistrement audio mot à mot." },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erreur STT Gemini: ${err}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  }

  async scanReceiptBase64(imageBase64: string, mimeType = 'image/jpeg'): Promise<ReceiptScanResult> {
    if (!this.apiKey) {
      throw new Error("Clé API Gemini non configurée.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: RECEIPT_VISION_PROMPT }],
        },
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              { text: "Extrais les données de ce ticket de caisse en JSON." },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erreur Vision Gemini: ${err}`);
    }

    const json = await response.json();
    const rawJsonText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(rawJsonText);
  }

  async sendAgentMessage(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }> }>
  ): Promise<{ text?: string; toolCalls?: Array<{ name: string; args: any }> }> {
    if (!this.apiKey) {
      throw new Error("Clé API Gemini non configurée.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    // Convert tools format for Gemini REST API
    const functionDeclarations = AI_TOOLS_DECLARATIONS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties).map(([k, v]) => [
            k,
            { type: v.type, description: (v as any).description, enum: (v as any).enum },
          ])
        ),
        required: t.parameters.required,
      },
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: history,
        tools: [{ functionDeclarations }],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erreur Agent Gemini: ${err}`);
    }

    const json = await response.json();
    const candidate = json.candidates?.[0]?.content;
    const parts = candidate?.parts || [];

    const textPart = parts.find((p: any) => p.text)?.text;
    const functionCalls = parts
      .filter((p: any) => p.functionCall)
      .map((p: any) => ({
        name: p.functionCall.name,
        args: p.functionCall.args,
      }));

    return {
      text: textPart,
      toolCalls: functionCalls.length > 0 ? functionCalls : undefined,
    };
  }
}

export const geminiClient = new GeminiClient(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
