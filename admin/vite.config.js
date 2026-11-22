import { defineConfig } from 'vite';

const host = '127.0.0.1';
const port = Number(process.env.ADMIN_PORT || 5173);
const proxy = {
  '/api': {
    target: process.env.ADMIN_API_ORIGIN || 'http://127.0.0.1:4000',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api(?=\/|$)/, ''),
  },
};

export default defineConfig({
  server: { host, port, proxy },
  preview: { host, port, proxy },
});
