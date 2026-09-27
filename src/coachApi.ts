/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CoachChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function callOffRampCoach(
  systemInstruction: string,
  messages: CoachChatMessage[]
): Promise<string> {
  const res = await fetch('/api/coach/offramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, messages }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.error || 'Failed to communicate with Coach');
  }

  return data.text;
}

export async function callOnRampCoach(
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const res = await fetch('/api/coach/onramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, prompt }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.error || 'Failed to communicate with Coach');
  }

  return data.text;
}
