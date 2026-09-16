import { readFile } from 'node:fs/promises'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

/**
 * A PDF's own table of contents, used to turn "read this book by June" into
 * "pages 45-68, chapter 3" every morning.
 *
 * Only the top level is taken: the point is to size a day's reading, not to
 * rebuild the book's structure. A PDF with no bookmarks - a scan, an export
 * from a word processor - is perfectly normal, so a missing outline comes back
 * as an empty list rather than an error, and the user types the chapters in.
 */
export interface PdfSection {
  title: string
  startPage: number
}

export interface PdfOutline {
  pageCount: number
  sections: PdfSection[]
}

interface OutlineNode {
  title: string
  dest: string | unknown[] | null
}

export async function readPdfOutline(filePath: string): Promise<PdfOutline> {
  const data = new Uint8Array(await readFile(filePath))
  // Nothing here renders the PDF; it is read for its page count and bookmarks
  // only, so fonts and network fetching stay switched off.
  const loadingTask = getDocument({ data, useWorkerFetch: false, useSystemFonts: false })
  const doc = await loadingTask.promise

  try {
    const pageCount = doc.numPages
    let outline: OutlineNode[] | null = null
    try {
      outline = (await doc.getOutline()) as OutlineNode[] | null
    } catch {
      outline = null
    }
    if (!outline?.length) return { pageCount, sections: [] }

    const sections: PdfSection[] = []
    for (const node of outline) {
      const title = (node.title ?? '').trim()
      if (!title) continue
      const startPage = await resolvePage(doc, node.dest)
      if (startPage == null) continue
      sections.push({ title, startPage })
    }

    sections.sort((a, b) => a.startPage - b.startPage)
    return { pageCount, sections }
  } finally {
    await loadingTask.destroy()
  }
}

/** A bookmark points at a named destination or at an explicit one; both resolve to a page. */
async function resolvePage(doc: PDFDocumentProxy, dest: OutlineNode['dest']): Promise<number | null> {
  try {
    const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    if (!Array.isArray(explicit) || explicit.length === 0) return null
    return (await doc.getPageIndex(explicit[0] as never)) + 1
  } catch {
    return null
  }
}
