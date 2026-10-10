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
          lucide: ['lucide-react'],
          ui: ['class-variance-authority', 'clsx', 'tailwind-merge'],
          magicui: [
            '@/components/magicui/animated-grid-pattern',
            '@/components/magicui/blur-fade',
            '@/components/magicui/globe',
            '@/components/magicui/orbiting-circles',
            '@/components/magicui/hero-video-dialog',
            '@/components/magicui/shimmer-button',
            '@/components/magicui/text-animate',
            '@/components/magicui/particles',
            '@/components/magicui/meteors',
            '@/components/magicui/marquee',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
