import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Minimal UI kit files import from `src/...` — alias it to the same root.
      src: path.resolve(__dirname, './src'),
    },
    // Force a single copy of React/MUI/Emotion so deep imports don't get a
    // second React instance ("Invalid hook call" / useContext null).
    dedupe: ['react', 'react-dom', '@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
  },
  server: {
    // Match CORS_ORIGIN from the backend's .env.example
    port: 3000,
    strictPort: true,
  },
});
