import { preservedEventChannel } from "./shared";
import type { EventConfig, Event } from "../event";

export const eventEmitter = window[preservedEventChannel as keyof Window] as {
  init: () => Promise<void>;
  on: <T>(config: EventConfig<T>, callback: (event: Event<T>) => void) => void;
  emit: <T>(config: EventConfig<T>, eventData: T) => void;
};

if (!eventEmitter) {
  console.warn("Event emitter is not initialized yet");
}
