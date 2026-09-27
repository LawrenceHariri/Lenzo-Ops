/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function hashPin(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  if (!pin || !expectedHash) return false;
  const hashed = await hashPin(pin);
  return hashed.toLowerCase() === expectedHash.trim().toLowerCase();
}
