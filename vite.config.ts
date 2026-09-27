/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { reactDevtools } from './plugins/react-devtools.ts'

const isTest = process.env.VITEST === 'true'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    !isTest && devtools(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      // autoCodeSplitting: true,
    }),
    viteReact(),
    !isTest && reactDevtools(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})

export default config
