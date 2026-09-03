import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // CP8 perf: split the heavy Firebase SDK out of the main bundle and put
    // framer-motion on its own chunk. Pages that don't need motion (e.g.
    // pure admin/utility views) can lazy-load their motion deps later.
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
          ],
          motion: ['framer-motion'],
          router: ['react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          three: ['three', '@react-three/fiber', '@react-three/drei', '@react-spring/three'],
          gsap: ['gsap'],
          lenis: ['lenis'],
          lottie: ['lottie-react'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
