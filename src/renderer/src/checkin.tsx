import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CheckinApp } from './checkin/CheckinApp'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CheckinApp />
  </StrictMode>
)
