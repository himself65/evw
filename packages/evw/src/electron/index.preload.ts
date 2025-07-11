// renderer process
import type { EventConfig, Event } from "../event";
import { ipcRenderer, contextBridge } from "electron";
import { preservedEventChannel } from "./shared";
import { getEventConfig, getEventId } from "evw/global";

type AnyValue = unknown;
type AnyEventConfig = EventConfig<AnyValue>;
type AnyEvent = Event<AnyValue>;
type Args = [eventId: string, eventData: any];
type AnyCallback = (event: AnyEvent) => void;

export async function initEventChannel() {
  const eventsCallbackMap = new Map<AnyEventConfig, Set<AnyCallback>>();
  let port: MessagePort | null = null;
  const promise = new Promise<void>((resolve) => {
    // Listen for messages from the main process
    ipcRenderer.on(preservedEventChannel, (event) => {
      port = event.ports[0]!;
      port.onmessage = ({ data }) => {
        const [eventId, eventData] = data as Args;
        const eventConfig = getEventConfig(eventId);
        if (!eventConfig) {
          console.warn(`No event config found for event ID: ${eventId}`);
          return;
        }
        const event = eventConfig.with(eventData);
        const callbacks = eventsCallbackMap.get(eventConfig);
        if (callbacks) {
          callbacks.forEach((callback) => callback(event));
        }
      };
      resolve();
    });
  });
  contextBridge.exposeInMainWorld(preservedEventChannel, {
    init: () => promise,
    on: <T>(
      config: EventConfig<T>,
      callback: (event: Event<T>) => void,
    ): void => {
      if (!port) {
        throw new Error("Event channel is not initialized yet");
      }
      if (!eventsCallbackMap.has(config as AnyEventConfig)) {
        eventsCallbackMap.set(config as AnyEventConfig, new Set());
      }
      const callbacks = eventsCallbackMap.get(config as AnyEventConfig)!;
      callbacks.add(callback as AnyCallback);
    },
    emit: <T>(config: EventConfig<T>, eventData: T): void => {
      if (!port) {
        throw new Error("Event channel is not initialized yet");
      }
      const eventId = getEventId(config);
      port.postMessage([eventId, eventData] as Args);
    },
  });
}
