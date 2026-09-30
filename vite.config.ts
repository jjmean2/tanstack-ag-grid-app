/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isTest = process.env.VITEST === 'true'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    !isTest &&
      devtools({
        // The "go to source" attribute would reach AgGridReact as an unknown
        // grid option (AG Grid warnings #307/#310).
        injectSource: {
          enabled: true,
          ignore: { components: ['AgGridReact'] },
        },
      }),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      // autoCodeSplitting: true,
    }),
    viteReact(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'packages/*/src/**/*.{test,spec}.{ts,tsx}',
    ],
    css: false,
  },
})

export default config
