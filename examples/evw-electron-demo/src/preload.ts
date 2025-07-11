// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { initEventChannel } from "evw/electron/preload";

const initPromise = initEventChannel();

initPromise.then(() => {
  console.log("preload init");
});
