// Pruebas unitarias (lógica pura, sin navegador real): npm run test:unit
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const src = (f) => fileURLToPath(new URL(`./src/${f}`, import.meta.url))

export default defineConfig({
  // Los wrappers importan 'nexus-tours/…': en las pruebas apuntan al código fuente, no a dist/.
  resolve: {
    alias: {
      'nexus-tours/checklist': src('checklist.ts'),
      'nexus-tours': src('index.ts'),
    },
  },
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      // Lógica pura. Los módulos de interfaz (tour, checklist, builder, wrappers) se cubren en test/e2e.
      include: ['src/{fixtures,router,storage,theme,wait,practice,supabase}.ts', 'src/core/{layout,progress}.ts'],
      // Piso de cobertura: el CI falla si baja. Súbelo conforme agregues pruebas.
      thresholds: { lines: 90, functions: 85, branches: 75, statements: 88 },
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
