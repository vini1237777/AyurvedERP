import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // The app calls /api on its own origin; the dev server forwards it to the
  // API. VITE_API_URL is still read so an existing .env.local keeps working.
  const target =
    env.API_PROXY_TARGET ||
    (env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : "http://localhost:5000");
  const proxy = { "/api": { target, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { proxy },
  };
});
