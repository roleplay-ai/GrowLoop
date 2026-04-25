'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  children: string
  className?: string
}

export default function Markdown({ children, className = '' }: Props) {
  return (
    <div className={`prose-coach ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-brand-dark">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h2 className="text-base font-black text-brand-dark mt-3 mb-1.5">{children}</h2>,
          h2: ({ children }) => <h3 className="text-sm font-black text-brand-dark mt-3 mb-1.5">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-bold text-brand-dark mt-2 mb-1">{children}</h4>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-purple font-semibold underline decoration-brand-purple/30 underline-offset-2 hover:decoration-brand-purple transition-colors">
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-brand-cream text-brand-purple font-mono text-[0.85em] border border-brand-purple/15">
                  {children}
                </code>
              )
            }
            return (
              <code className="block bg-brand-dark text-brand-yellow/90 font-mono text-xs p-3 rounded-lg overflow-x-auto my-2 border border-white/10">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand-yellow pl-3 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-card-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
