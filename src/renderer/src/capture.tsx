import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CaptureApp } from './capture/CaptureApp'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaptureApp />
  </StrictMode>
)
