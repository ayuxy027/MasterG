import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'markdown': ['react-markdown', 'remark-gfm'],
          'katex': ['remark-math', 'rehype-katex', 'katex'],
          'charts': ['recharts'],
          'docs': ['docx-preview'],
          'icons': ['lucide-react', 'react-icons'],
        },
      },
    },
  },
})
