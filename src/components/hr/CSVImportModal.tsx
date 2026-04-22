'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreateParticipants } from '@/app/(hr)/participants/actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ParsedRow {
  name: string
  email: string
  password: string
  title?: string
  func?: string
  group_name?: string
  _rowNum: number
  _error?: string
}

interface ImportResult {
  created: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
  credentials: Array<{ email: string; password: string; name: string }>
}

const EXPECTED_COLUMNS = ['name', 'email', 'password', 'title', 'func', 'group_name']
const REQUIRED_COLUMNS = ['name', 'email', 'password']

export default function CSVImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data as any[]
        if (rows.length === 0) {
          setParseError('CSV is empty')
          setParsedRows([])
          return
        }

        // Validate columns
        const headers = Object.keys(rows[0])
        const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(', ')}`)
          setParsedRows([])
          return
        }

        // Validate each row
        const seen = new Set<string>()
        const parsed: ParsedRow[] = rows.map((row, i) => {
          const r: ParsedRow = {
            name: (row.name || '').trim(),
            email: (row.email || '').trim().toLowerCase(),
            password: (row.password || '').trim(),
            title: (row.title || '').trim() || undefined,
            func: (row.func || '').trim() || undefined,
            group_name: (row.group_name || '').trim() || undefined,
            _rowNum: i + 2,
          }

          if (!r.name) r._error = 'Missing name'
          else if (!r.email) r._error = 'Missing email'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) r._error = 'Invalid email format'
          else if (!r.password) r._error = 'Missing password'
          else if (seen.has(r.email)) r._error = 'Duplicate email in CSV'

          seen.add(r.email)
          return r
        })

        setParsedRows(parsed)
      },
      error: (err) => {
        setParseError(`Parse error: ${err.message}`)
        setParsedRows([])
      },
    })
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => !r._error)
    if (validRows.length === 0) return

    setIsImporting(true)
    const result = await bulkCreateParticipants(
      validRows.map(r => ({
        name: r.name,
        email: r.email,
        password: r.password,
        title: r.title,
        func: r.func,
        group_name: r.group_name,
      }))
    )

    if (result.success) {
      setImportResult({
        created: result.created,
        failed: result.failed,
        errors: result.errors,
        credentials: result.credentials,
      })
      onSuccess?.()
    } else {
      setParseError(result.error ?? 'Import failed')
    }

    setIsImporting(false)
  }

  const downloadCredentialsCSV = () => {
    if (!importResult) return
    const header = 'name,email,password\n'
    const rows = importResult.credentials.map(c => `${c.name},${c.email},${c.password}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participant-credentials.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTemplate = () => {
    const template = 'name,email,password,title,func,group_name\nJohn Doe,john@example.com,Welcome123!,Engineer,Engineering,\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participant-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setParsedRows([])
    setFileName('')
    setImportResult(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  const validCount = parsedRows.filter(r => !r._error).length
  const errorCount = parsedRows.filter(r => r._error).length

  // Success state
  if (importResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-black text-white">Import Complete</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg text-center">
              <div className="text-3xl font-black text-brand-green">{importResult.created}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wide mt-1">Created</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <div className="text-3xl font-black text-red-400">{importResult.failed}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wide mt-1">Failed</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-white/80 mb-2">Errors:</h3>
              <div className="max-h-40 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-400">
                    <span className="font-mono">Row {err.row}</span> ({err.email}): {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {importResult.credentials.length > 0 && (
              <button
                onClick={downloadCredentialsCSV}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Download Credentials CSV
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-white">Bulk Import Participants</h2>
            <p className="text-xs text-white/50 mt-1">Upload a CSV file to create multiple participants at once</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="text-xs font-bold text-brand-yellow hover:underline"
          >
            Download Template
          </button>
        </div>

        {/* File upload */}
        {!fileName && (
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-white/70 mb-4">Upload a CSV file with participant details</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-block px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors cursor-pointer"
            >
              Select CSV File
            </label>
            <p className="text-[10px] text-white/40 mt-4">
              Required columns: <span className="font-mono">name, email, password</span><br />
              Optional: <span className="font-mono">title, func, group_name</span>
            </p>
          </div>
        )}

        {parseError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 mb-4">
            {parseError}
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/70">
                  📄 <span className="font-mono">{fileName}</span>
                </span>
                <span className="text-xs text-brand-green font-semibold">✓ {validCount} valid</span>
                {errorCount > 0 && (
                  <span className="text-xs text-red-400 font-semibold">✗ {errorCount} errors</span>
                )}
              </div>
              <button
                onClick={reset}
                className="text-[10px] font-bold text-white/60 hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="border border-white/10 rounded-lg overflow-hidden mb-4">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      {['#', 'Name', 'Email', 'Password', 'Title', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-bold text-white/60 uppercase text-[9px] tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 20).map((row, i) => (
                      <tr key={i} className={`border-t border-white/5 ${row._error ? 'bg-red-500/5' : ''}`}>
                        <td className="px-3 py-2 text-white/40 font-mono">{row._rowNum}</td>
                        <td className="px-3 py-2 text-white">{row.name || '-'}</td>
                        <td className="px-3 py-2 text-white/70 font-mono">{row.email || '-'}</td>
                        <td className="px-3 py-2 text-white/70 font-mono">
                          {row.password ? '••••••' : '-'}
                        </td>
                        <td className="px-3 py-2 text-white/50">{row.title || '-'}</td>
                        <td className="px-3 py-2">
                          {row._error ? (
                            <span className="text-red-400 text-[10px]">{row._error}</span>
                          ) : (
                            <span className="text-brand-green text-[10px]">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 20 && (
                <div className="px-3 py-2 bg-white/5 text-[10px] text-white/50 text-center">
                  Showing first 20 of {parsedRows.length} rows
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
            disabled={isImporting || validCount === 0}
          >
            {isImporting ? 'Importing...' : `Import ${validCount} Participant${validCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
