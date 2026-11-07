import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', name: 'NexusTours', fileName: 'nexus-tours', formats: ['es', 'umd'] },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
  },
})
