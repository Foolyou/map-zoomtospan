import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['html'],
      include: ['src/zoomtospan.ts'],
    },
  },
})
