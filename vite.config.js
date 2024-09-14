import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'demo',
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts', // Your library's entry point
      name: 'map-zoomtospan', // The name of your library
      fileName: (format) => `map-zoomtospan.${format}.js`
    },
    rollupOptions: {
      // Preserve variable names
      output: {
        minifyInternalExports: false
      }
    },
    minify: false, // Disable minification
    target: 'es2015', // Use modern JavaScript features
    sourcemap: true, // Generate source maps
    // Preserve variable and function names
    terserOptions: {
      mangle: false,
      keep_fnames: true,
      keep_classnames: true
    }
  }
})
