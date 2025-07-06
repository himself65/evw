import { defineConfig } from "vite";
import evwPlugin from "evw-unplugin/vite";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [evwPlugin()],
});
