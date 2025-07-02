import { AsyncContext } from "evw/async-context";
import type { EventConfig, Event } from "./event.js";

type AnyValue = unknown;
type AnyEventConfig = EventConfig<AnyValue>;
type AnyEvent = Event<AnyValue>;

type InternalWorkflowContext = {
  prev: InternalWorkflowContext | null;
  next: Set<InternalWorkflowContext>;

  inputsSource: AnyEventConfig[];
  inputs: AnyEvent[];

  outputs: AnyEvent[];

  sendEvent: (...events: AnyEvent[]) => void;
  abortController: AbortController;
};

const currentWorkflowContext =
  new AsyncContext.Variable<InternalWorkflowContext>();

type Fn<ECs extends EventConfig<any>[], R extends Event<any>> = (
  ...event: {
    [K in keyof ECs]: ReturnType<ECs[K]["with"]>;
  }
) => R | void | Promise<R> | Promise<void>;
type AnyFn = Fn<AnyEventConfig[], Event<AnyValue>>;

export interface Context {
  sendEvent: (...events: AnyEvent[]) => void;

  get signal(): AbortSignal;
}

const icWeakMap = new WeakMap<InternalWorkflowContext, Context>();
export const getCurrentContext = (): Context => {
  const currentContext = currentWorkflowContext.get();
  if (!currentContext) {
    throw new Error(
      "No current context found! This is likely a bug, please report it.",
    );
  }
  if (!icWeakMap.has(currentContext)) {
    const context: Context = {
      sendEvent: (...events: AnyEvent[]) => {
        currentContext.sendEvent(...events);
      },
      get signal() {
        return currentContext.abortController.signal;
      },
    };
    icWeakMap.set(currentContext, context);
  }
  return icWeakMap.get(currentContext)!;
};

export interface Workflow {
  handle<const ECs extends AnyEventConfig[], R extends Event<AnyValue>>(
    events: ECs,
    fn: Fn<ECs, R>,
  ): void;

  handle<EC extends AnyEventConfig, R extends Event<AnyValue>>(
    event: EC,
    fn: Fn<[EC], R>,
  ): void;

  createContext(): Context;
}

function flattenEvents(
  eventConfigs: AnyEventConfig[],
  inputEventData: AnyEvent[],
): AnyEvent[] {
  const acceptance: AnyEvent[] = new Array(eventConfigs.length);
  for (const event of inputEventData) {
    for (let i = 0; i < eventConfigs.length; i++) {
      if (acceptance[i]) {
        continue;
      }
      if (eventConfigs[i]!.has(event)) {
        acceptance[i] = event;
        break;
      }
    }
  }
  return acceptance.filter(Boolean);
}

export const createWorkflow = (): Workflow => {
  const listeners = new Map<AnyEventConfig[], Set<AnyFn>>();
  return {
    handle: function handler(events: AnyEventConfig[], fn: AnyFn): void {
      if (!Array.isArray(events)) {
        events = [events] as AnyEventConfig[];
      }
      if (!listeners.has(events)) {
        listeners.set(events, new Set<AnyFn>());
      }
      const set = listeners.get(events)!;
      set.add(fn);
      listeners.set(events, set);
    },
    createContext: function createContext() {
      const queue: AnyEvent[] = [];

      function runHandler(
        handler: AnyFn,
        inputs: AnyEvent[],
        currentContext: InternalWorkflowContext,
      ): void {
        try {
          const resultOrPromise = currentWorkflowContext.run(
            currentContext,
            () => {
              // Run the handler with the current context
              return handler(...inputs);
            },
          );
          if (resultOrPromise instanceof Promise) {
            resultOrPromise.then((result) => {
              if (result) {
                queue.push(result);
              }
            });
          } else if (typeof resultOrPromise === "object") {
            queue.push(resultOrPromise);
          }
        } finally {
        }
      }

      function handleQueue(currentContext: InternalWorkflowContext) {
        const queueSnapshot = [...queue];
        [...listeners]
          .filter(([events]) => {
            const inputs = flattenEvents(events, queueSnapshot);
            return inputs.length === events.length;
          })
          .map(([events, handlers]) => {
            const inputs = flattenEvents(events, queueSnapshot);
            inputs.forEach((input) => {
              queue.splice(queue.indexOf(input), 1);
            });
            let lazyAbortController: AbortController | undefined;
            const nextContext: InternalWorkflowContext = {
              prev: currentContext,
              next: new Set(),
              inputsSource: events,
              inputs,
              outputs: [],
              sendEvent: (...events: AnyEvent[]) => {
                queue.push(...events);
                nextContext.outputs.push(...events);
                handleQueue(nextContext);
              },
              get abortController() {
                if (!lazyAbortController) {
                  lazyAbortController = new AbortController();
                }
                return lazyAbortController;
              },
            };
            currentContext.next.add(nextContext);
            for (const handler of handlers) {
              runHandler(handler, inputs, nextContext);
            }
          });
      }

      const rootAbortController = new AbortController();

      const contextRoot: InternalWorkflowContext = {
        prev: null,
        next: new Set(),
        inputs: [],
        inputsSource: [],
        outputs: [],
        sendEvent: (...events: AnyEvent[]) => {
          queue.push(...events);
          contextRoot.outputs.push(...events);
          handleQueue(contextRoot);
        },
        get abortController() {
          return rootAbortController;
        },
      };

      return {
        get signal() {
          return contextRoot.abortController.signal;
        },
        sendEvent: (...events: AnyEvent[]) => {
          contextRoot.sendEvent(...events);
        },
      };
    },
  };
};
