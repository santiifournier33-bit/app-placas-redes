import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next.js server-only guard — empty mock in test environment
      'server-only': path.resolve(__dirname, './src/tests/mocks/server-only.ts'),
    },
  },
})
