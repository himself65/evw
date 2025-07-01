type Event<Data> = {
  get data(): Data;
};

type EventConfig<Data> = {
  toString: () => string;
  with: (data: Data) => Event<Data>;
  debugLabel?: string;
};

let count = 0;

export const defineEvent = <Data>(): EventConfig<Data> => {
  const key = `event-${++count}`;
  const config: EventConfig<Data> = {
    toString: () =>
      import.meta.env?.MODE === "development" && config.debugLabel
        ? key + ":" + config.debugLabel
        : key,
    with: (data: Data) => ({
      get data() {
        return data;
      },
    }),
  };
  return config;
};
