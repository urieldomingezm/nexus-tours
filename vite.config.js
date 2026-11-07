import { defineConfig } from 'vite'

// `vite build` → core (dist/nexus-tours.*) ; `vite build --mode fixtures` → example data (dist/fixtures.*)
export default defineConfig(({ mode }) => {
  const fixtures = mode === 'fixtures'
  return {
    build: {
      lib: fixtures
        ? { entry: 'src/fixtures.ts', name: 'NexusToursFixtures', fileName: 'fixtures', formats: ['es', 'umd'] }
        : { entry: 'src/index.ts', name: 'NexusTours', fileName: 'nexus-tours', formats: ['es', 'umd'] },
      emptyOutDir: !fixtures,
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: true,
    },
  }
})
