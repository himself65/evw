import type { EventConfig } from "../event";

type AnyValue = unknown;
type AnyEventConfig = EventConfig<AnyValue>;

const registerMap = new Map<string, AnyEventConfig>();

export function registerEvent(event: AnyEventConfig, hash: string) {
  if (registerMap.has(hash) && registerMap.get(hash) !== event) {
    throw new Error(`Event with hash ${hash} is already registered.`);
  }
  registerMap.set(hash, event);
}
