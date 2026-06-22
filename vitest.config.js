import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/components/**'],
      exclude: ['src/**/__tests__/**'],
    },
  },
})
