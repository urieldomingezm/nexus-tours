// ESLint (calidad del código). El formato lo hace Prettier: npm run format
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist/', 'site-dist/', 'demo-dist/', 'coverage/', 'playwright-report/', 'test-results/', 'node_modules/', '.base/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      // La librería atrapa errores del código del usuario a propósito (callbacks, storage) y sigue.
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Los callbacks públicos aceptan datos del usuario sin forma fija (rpc, functions).
      '@typescript-eslint/no-explicit-any': 'off',
      // Expresiones cortas como `cond && accion()` y `(a = b, c.push(a))` se usan en el render.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      eqeqeq: ['error', 'always'],
      // `const self = this` para getters que leen el estado vivo del tour.
      '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self'] }],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    // Pruebas y scripts: corren en Node y en el navegador (page.evaluate usa globales de la página).
    files: ['test/**/*.{ts,mjs}', 'scripts/**/*.mjs', '*.config.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Globales que definen las páginas de prueba (index.html, features.html, …).
        t: 'writable',
        t2: 'writable',
        b: 'writable',
        cl: 'writable',
        ev: 'readonly',
        S: 'readonly',
        hits: 'readonly',
        makeTour: 'readonly',
        practiceCfg: 'readonly',
        practiceEv: 'readonly',
        Guiame: 'readonly',
        NexusTours: 'readonly',
        Tour: 'readonly',
        TourBuilder: 'readonly',
        bestSelector: 'readonly',
        make: 'readonly',
        mk: 'readonly',
        axios: 'readonly',
        sbLive: 'readonly',
        sbDefault: 'readonly',
        events: 'readonly',
        cfg: 'readonly',
        db: 'writable',
        store: 'readonly',
        log: 'readonly',
      },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty-pattern': 'off', // fixtures de Playwright: async ({}, use) => …
    },
  },
  {
    files: ['src/react.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  prettier,
)
