// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("electron/main/index.ts")
      }
    },
    resolve: {
      alias: { "@engine": resolve("electron/main/engine") }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("electron/preload/index.ts")
      }
    }
  },
  renderer: {
    root: resolve("src"),
    build: {
      rollupOptions: {
        input: resolve("src/index.html")
      }
    },
    resolve: {
      alias: { "@": resolve("src") }
    },
    plugins: [tailwindcss(), react()]
  }
});
export {
  electron_vite_config_default as default
};
