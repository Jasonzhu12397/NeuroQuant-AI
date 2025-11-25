import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: This allows the app to run in a subdirectory (like GitHub Pages)
  base: './', 
  define: {
    // Prevents "process is not defined" error in the browser
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});