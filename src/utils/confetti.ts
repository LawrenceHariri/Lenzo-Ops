/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import confetti from 'canvas-confetti';

export function fireTaskDoneConfetti(x = 0.5, y = 0.7) {
  try {
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { x, y },
      colors: ['#6366F1', '#10B981', '#F59E0B', '#38BDF8', '#8B5CF6'],
      ticks: 200,
      gravity: 1.2,
      decay: 0.94,
      startVelocity: 25,
      shapes: ['circle', 'square'],
      scalar: 0.9,
    });
  } catch {
    // Graceful fallback if canvas is not available
  }
}
