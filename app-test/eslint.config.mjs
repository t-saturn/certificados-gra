// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  // Configuraciones base de Next.js
  ...nextVitals,
  ...nextTs,

  // Configuración de Prettier
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier como error
      'prettier/prettier': 'error',

      // Tus reglas personalizadas
      'prefer-const': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'react/jsx-fragments': ['error', 'syntax'],
      'react/self-closing-comp': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },

  // Desactivar reglas que chocan con Prettier (DEBE ir al final)
  prettierConfig,
]);

// MOVER TODOS LOS IGNORES AQUÍ (reemplaza globalIgnores anterior)
export default [
  ...eslintConfig,
  {
    ignores: [
      // Build outputs
      '.next/**',
      'out/**',
      'build/**',

      // Dependencies
      'node_modules/**',

      // TypeScript
      '**/*.d.ts',
      'next-env.d.ts',

      // Config files (opcional)
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',

      // Logs
      '**/npm-debug.log*',
      '**/yarn-debug.log*',
      '**/yarn-error.log*',
    ],
  },
];