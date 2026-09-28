import type { Fulfillment, Stage } from './db/types'

/** Stage names and tracker copy, per the handoff. Index === stage. */
export function stageLabels(fulfillment: Fulfillment): [string, string, string, string] {
  return fulfillment === 'delivery'
    ? ['Order received', 'Being packed', 'Out for delivery', 'Delivered']
    : ['Order received', 'Being packed', 'Ready for pickup', 'Picked up']
}

/** Shorter labels for the admin queue, where space is tight. */
export function adminStageLabels(fulfillment: Fulfillment): [string, string, string, string] {
  return fulfillment === 'delivery'
    ? ['Received', 'Being packed', 'Out for delivery', 'Delivered']
    : ['Received', 'Being packed', 'Ready for pickup', 'Picked up']
}

export function stageCopy(fulfillment: Fulfillment, stage: Stage): string {
  return [
    "We've got it — the team just got pinged.",
    'Gloves on. Your order is being packed.',
    fulfillment === 'delivery' ? "It's moving through the night." : "It's on the counter with your name on it.",
    'Enjoy. After dark, everything blooms.',
  ][stage]
}

export function isStage(n: unknown): n is Stage {
  return n === 0 || n === 1 || n === 2 || n === 3
}
