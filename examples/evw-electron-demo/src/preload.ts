// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { startEvent } from "./events";
import { initEventChannel } from "evw/electron/preload";

const initPromise = initEventChannel();

await initPromise;
