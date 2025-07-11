import type { EventConfig } from "../event";

type AnyValue = unknown;
type AnyEventConfig = EventConfig<AnyValue>;

const registerMap = new Map<string, AnyEventConfig>();
const reverseMap = new WeakMap<AnyEventConfig, string>();

export function registerEvent(event: AnyEventConfig, hash: string) {
  if (registerMap.has(hash) && registerMap.get(hash) !== event) {
    throw new Error(`Event with hash ${hash} is already registered.`);
  }
  registerMap.set(hash, event);
  reverseMap.set(event, hash);
}

export function getEventId<T>(event: EventConfig<T>): string {
  const hash = reverseMap.get(event as AnyEventConfig);
  if (hash) {
    return hash;
  }
  throw new Error("Event not found in the registry.");
}

export function getEventConfig<T>(hash: string): EventConfig<T> | undefined {
  const event = registerMap.get(hash);
  if (event) {
    return event as EventConfig<T>;
  }
  return undefined;
}
