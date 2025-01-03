import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'p5': 'p5/lib/p5.min.js'
    }
  }
}); 