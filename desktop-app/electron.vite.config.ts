import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['better-sqlite3', 'electron-updater', 'electron-store'],
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts')
      }
    }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        // Map @/ to the WEBAPP's src/ for shared components
        '@': resolve(__dirname, '../src'),
        // Desktop-specific modules
        '@desktop': resolve(__dirname, 'src/renderer')
      }
    },
    css: {
      postcss: {
        plugins: []
      }
    },
    // Use the webapp's index.html as template
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    }
  }
})
