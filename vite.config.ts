import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20 * 1024,
          groups: [
            {
              debugName: 'vendor-packages',
              name(moduleId) {
                const packageMatch = moduleId.match(/node_modules[\\/](?:@([^\\/]+)[\\/])?([^\\/]+)/);
                if (!packageMatch) return null;
                return `vendor-${packageMatch[1] ? `${packageMatch[1]}-${packageMatch[2]}` : packageMatch[2]}`;
              },
              test: /node_modules[\\/]/,
              maxSize: 480 * 1024
            }
          ]
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 3000,
    strictPort: false,
  },
});
