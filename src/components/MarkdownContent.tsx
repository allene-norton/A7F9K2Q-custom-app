'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none text-gray-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Keep headings reasonably sized within cards
          h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-1 mb-0.5">{children}</h3>,
          p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              {children}
            </a>
          ),
          hr: () => <hr className="my-2 border-gray-200" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 my-1.5">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.includes('language-');
            return isBlock ? (
              <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs my-1.5">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
