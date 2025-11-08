import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/huggingface': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/huggingface/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward the Authorization header from the custom header
            const authHeader = req.headers['x-hf-token'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', `Bearer ${authHeader}`);
              // Remove the custom header so it doesn't get sent to Hugging Face
              proxyReq.removeHeader('x-hf-token');
            }
            console.log('🔀 Proxying request to:', proxyReq.path);
            console.log('🔑 Has auth token:', !!authHeader);
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('❌ Proxy error:', err);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('✅ Proxy response status:', proxyRes.statusCode);
          });
        },
      },
    },
  },
});
