import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const src = (f) => fileURLToPath(new URL(`./src/${f}`, import.meta.url))
const ALIAS = {
  'nexus-tours/checklist': src('checklist.ts'), 'nexus-tours/fixtures': src('fixtures.ts'), 'nexus-tours/themes': src('themes.ts'), 'nexus-tours/vue': src('vue.ts'), 'nexus-tours/react': src('react.ts'), 'nexus-tours': src('index.ts') }

// Library builds (one per mode). `vite build` = core. See "build" in package.json.
const LIBS = {
  core: { entry: 'src/index.ts', name: 'NexusTours', fileName: 'nexus-tours', formats: ['es', 'umd'], external: [] },
  fixtures: { entry: 'src/fixtures.ts', name: 'NexusToursFixtures', fileName: 'fixtures', formats: ['es', 'umd'], external: [] },
  themes: { entry: 'src/themes.ts', name: 'NexusToursThemes', fileName: 'themes', formats: ['es', 'umd'], external: [] },
  checklist: { entry: 'src/checklist.ts', name: 'NexusToursChecklist', fileName: 'checklist', formats: ['es', 'cjs'], external: ['nexus-tours'] },
  vue: { entry: 'src/vue.ts', name: 'NexusToursVue', fileName: 'vue', formats: ['es', 'cjs'], external: ['nexus-tours', 'nexus-tours/checklist', 'vue'] },
  react: { entry: 'src/react.ts', name: 'NexusToursReact', fileName: 'react', formats: ['es', 'cjs'], external: ['nexus-tours', 'nexus-tours/checklist', 'react'] },
}

export default defineConfig(({ mode, command }) => {
  // Docs / demo site: `vite build --mode site` (root: site/)
  if (mode === 'site') {
    return {
      root: 'site',
      base: './',
      resolve: { alias: ALIAS },
      build: { outDir: '../site-dist', emptyOutDir: true, target: 'es2020' },
    }
  }
  const lib = LIBS[mode]
  if (command === 'build' && lib) {
    return {
      build: {
        lib: { entry: lib.entry, name: lib.name, fileName: lib.fileName, formats: lib.formats },
        rollupOptions: { external: lib.external },
        emptyOutDir: mode === 'core',
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: true,
      },
    }
  }
  // Dev server / tests: let wrappers import "nexus-tours" straight from source
  return { resolve: { alias: ALIAS } }
})
