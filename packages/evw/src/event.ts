export type Event<Data> = {
  get data(): Data;
};

export type EventConfig<Data> = {
  toString: () => string;
  with: (data: Data) => Event<Data>;
  has: (event: Event<unknown>) => event is Event<Data>;
  debugLabel?: string;
};

let count = 0;

type AnyValue = unknown;
type AnyEventConfig = EventConfig<any>;
type AnyEvent = Event<AnyValue>;

const refWeakMap = new WeakMap<AnyEvent, AnyEventConfig>();

export const defineEvent = <Data>(): EventConfig<Data> => {
  const key = `event-${++count}`;
  const config: EventConfig<Data> = {
    toString: () =>
      import.meta.env?.MODE === "development" && config.debugLabel
        ? key + ":" + config.debugLabel
        : key,
    has: (event: Event<unknown>): event is Event<Data> => {
      return refWeakMap.get(event) === config;
    },
    with: (data: Data) => {
      const ev: Event<Data> = {
        get data() {
          return data;
        },
      };
      refWeakMap.set(ev, config);
      return ev;
    },
  };
  return config;
};

export function source(event: AnyEvent): EventConfig<AnyValue> {
  const config = refWeakMap.get(event);
  if (!config) {
    throw new Error(`Event source not found for event: ${event.toString()}`);
  }
  return config;
}
