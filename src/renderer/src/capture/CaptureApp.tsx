import { useEffect, useRef, useState } from 'react'
import { api, report } from '../api'

/**
 * The single-line capture box behind the global hotkey. Anything with a date or
 * a time becomes a task straight away; anything else lands in the inbox, so a
 * thought can be dumped mid-work without deciding anything.
 */
export function CaptureApp(): React.JSX.Element {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // The window is reused rather than recreated, so it has to reset itself
    // every time it is shown.
    const onFocus = (): void => {
      setText('')
      setResult(null)
      inputRef.current?.focus()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    const value = text.trim()
    if (!value) return

    void api
      .invoke('capture:submit', value)
      .then((outcome) => {
        setText('')
        setResult(outcome.kind === 'task' ? `Added: ${outcome.task?.title ?? value}` : 'Saved to inbox')
        setTimeout(() => void api.invoke('capture:close'), 700)
      })
      .catch(report)
  }

  return (
    <div className="capture">
      <form className="capture__box" onSubmit={submit}>
        <input
          ref={inputRef}
          className="capture__input"
          placeholder="What just came to mind?"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') void api.invoke('capture:close')
          }}
        />
        <div className="capture__foot">
          {result ? (
            <span style={{ color: 'var(--accent)' }}>{result}</span>
          ) : (
            <>
              <span>
                <kbd>↩</kbd> save
              </span>
              <span>
                <kbd>esc</kbd> dismiss
              </span>
              <span className="spacer" />
              <span>A time or date makes it a task — otherwise it goes to the inbox</span>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
