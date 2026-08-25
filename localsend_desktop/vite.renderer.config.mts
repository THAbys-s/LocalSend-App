import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  root: "src/renderer",

  build: {
    outDir: "../../.vite/renderer/main_window",
    emptyOutDir: true,
  },
});
