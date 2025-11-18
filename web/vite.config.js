
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      template: {
        compilerOptions: {
          // Trate todas as tags com 'appkit-' como elementos customizados
          isCustomElement: (tag) => tag.includes('appkit-'),
        },
      },
    }),
  ],
})