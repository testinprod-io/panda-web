import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001,
    cors: true,
    headers: {
      // Strict CSP for the vault
      'Content-Security-Policy': `
        default-src 'none'; 
        script-src 'self'; 
        connect-src http://localhost:3002; 
        base-uri 'none'; 
        object-src 'none'; 
        require-trusted-types-for 'script'
      `.replace(/\s+/g, ' ').trim(),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    minify: false, // Keep readable for security auditing
  },
});