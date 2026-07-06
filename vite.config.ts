import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          axios: ['axios'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/miniprogram-api': {
        target: 'https://www.rabbits.ink',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
