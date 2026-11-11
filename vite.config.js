import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { docsPlugin } from './site/plugin-docs.mjs'

const src = (f) => fileURLToPath(new URL(`./src/${f}`, import.meta.url))
const ALIAS = {
  'nexus-tours/builder': src('builder.ts'),
  'nexus-tours/supabase': src('supabase.ts'),
  'nexus-tours/checklist': src('checklist.ts'),
  'nexus-tours/fixtures': src('fixtures.ts'),
  'nexus-tours/themes': src('themes.ts'),
  'nexus-tours/vue': src('vue.ts'),
  'nexus-tours/react': src('react.ts'),
  'nexus-tours': src('index.ts'),
}

// Library builds (one per mode). `vite build` = core. See "build" in package.json.
const LIBS = {
  all: { entry: 'src/global.ts', name: 'NexusTours', fileName: 'nexus-tours.all', formats: ['es', 'iife'], external: [] },
  core: { entry: 'src/index.ts', name: 'NexusTours', fileName: 'nexus-tours', formats: ['es', 'umd'], external: [] },
  fixtures: { entry: 'src/fixtures.ts', name: 'NexusToursFixtures', fileName: 'fixtures', formats: ['es', 'umd'], external: [] },
  themes: { entry: 'src/themes.ts', name: 'NexusToursThemes', fileName: 'themes', formats: ['es', 'umd'], external: [] },
  builder: {
    entry: 'src/builder.ts',
    name: 'NexusToursBuilder',
    fileName: 'builder',
    formats: ['es', 'cjs', 'iife'],
    external: ['nexus-tours'],
    globals: { 'nexus-tours': 'NexusTours' },
  },
  supabase: { entry: 'src/supabase.ts', name: 'NexusToursSupabase', fileName: 'supabase', formats: ['es', 'cjs'], external: [] },
  checklist: {
    entry: 'src/checklist.ts',
    name: 'NexusToursChecklist',
    fileName: 'checklist',
    formats: ['es', 'cjs'],
    external: ['nexus-tours'],
  },
  vue: {
    entry: 'src/vue.ts',
    name: 'NexusToursVue',
    fileName: 'vue',
    formats: ['es', 'cjs'],
    external: ['nexus-tours', 'nexus-tours/checklist', 'vue'],
  },
  react: {
    entry: 'src/react.ts',
    name: 'NexusToursReact',
    fileName: 'react',
    formats: ['es', 'cjs'],
    external: ['nexus-tours', 'nexus-tours/checklist', 'react'],
  },
}

export default defineConfig(({ mode, command }) => {
  // Docs / demo site: `vite build --mode site` (root: site/)
  if (mode === 'site') {
    return {
      root: 'site',
      base: './',
      plugins: [docsPlugin()],
      resolve: { alias: ALIAS },
      build: {
        outDir: '../site-dist',
        emptyOutDir: true,
        target: 'es2020',
        rollupOptions: {
          input: Object.fromEntries(['index', 'guia', 'demo'].map((p) => [p, fileURLToPath(new URL(`./site/${p}.html`, import.meta.url))])),
        },
      },
    }
  }
  // Demo para portafolio: `vite build --mode demo` (root: demo/) → demo-dist/
  if (mode === 'demo') {
    return {
      root: 'demo',
      base: process.env.DEMO_BASE || './', // p. ej. DEMO_BASE=/demos/nexus-tours/ si va dentro de otro sitio
      resolve: { alias: ALIAS },
      build: { outDir: '../demo-dist', emptyOutDir: true, target: 'es2020' },
    }
  }
  const lib = LIBS[mode]
  if (command === 'build' && lib) {
    return {
      resolve: mode === 'all' ? { alias: ALIAS } : undefined,
      build: {
        lib: { entry: lib.entry, name: lib.name, fileName: lib.fileName, formats: lib.formats },
        rollupOptions: { external: lib.external, output: lib.globals ? { globals: lib.globals } : undefined },
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
