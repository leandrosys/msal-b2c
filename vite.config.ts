import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: readFileSync(resolve(import.meta.dirname, "certificates/localhost.key")),
      cert: readFileSync(resolve(import.meta.dirname, "certificates/localhost.crt")),
    },
    port: 3000,
  },
});
