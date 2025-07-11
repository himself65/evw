import { type BrowserWindow, MessageChannelMain } from "electron";
import { getEventConfig, getEventId } from "evw/global";
import type { EventConfig, Event } from "../event";
import { source } from "../event";
import { preservedEventChannel } from "./shared";

type AnyValue = unknown;
type AnyEventConfig = EventConfig<AnyValue>;
type AnyEvent = Event<AnyValue>;
type Args = [eventId: string, eventData: any];
type AnyCallback = (event: AnyEvent) => void;

export function initEventChannel(browserWindow: BrowserWindow) {
  const eventsCallbackMap = new Map<AnyEventConfig, Set<AnyCallback>>();
  const { port1, port2 } = new MessageChannelMain();
  port1.on("message", ({ data }) => {
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
  });
  browserWindow.webContents.postMessage(preservedEventChannel, null, [port2]);
  // todo: should return a workflow API, but for now let's just return a fake stuff
  const ee = {
    on: <T>(
      eventConfig: EventConfig<T>,
      callback: (event: Event<T>) => void,
    ): void => {
      if (!eventsCallbackMap.has(eventConfig as AnyEventConfig)) {
        eventsCallbackMap.set(eventConfig as AnyEventConfig, new Set());
      }
      const callbacks = eventsCallbackMap.get(eventConfig as AnyEventConfig)!;
      callbacks.add(callback as AnyCallback);
    },
    off: <T>(
      eventConfig: EventConfig<T>,
      callback: (event: Event<T>) => void,
    ): void => {
      const callbacks = eventsCallbackMap.get(eventConfig as AnyEventConfig);
      if (callbacks) {
        callbacks.delete(callback as AnyCallback);
        if (callbacks.size === 0) {
          eventsCallbackMap.delete(eventConfig as AnyEventConfig);
        }
      }
    },
    once: <T>(
      eventConfig: EventConfig<T>,
      callback: (event: Event<T>) => void,
    ): void => {
      const wrappedCallback = (event: Event<T>) => {
        callback(event);
        ee.off(eventConfig, wrappedCallback);
      };
      ee.on(eventConfig, wrappedCallback);
    },
    emit: <T>(event: Event<T>): void => {
      const config = source(event)!;
      port1.postMessage([getEventId(config), event.data]);
    },
  };
  return ee;
}
