import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The browser talks to the SAME origin, so the httpOnly auth cookie is sent without CORS headaches.
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/ws': { target: 'http://localhost:4000', ws: true }, // chat WebSocket
    },
  },
});