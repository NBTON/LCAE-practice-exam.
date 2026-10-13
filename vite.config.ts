import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Project site includes the repository's trailing period: /LCAE-practice-exam./
export default defineConfig({
  base: '/LCAE-practice-exam./',
  plugins: [react()],
})
