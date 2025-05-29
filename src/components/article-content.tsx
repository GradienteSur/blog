import React, { useEffect, useRef, useState } from 'react';

// Copy button for code blocks
function CopyableCodeBlock({
  rawCode,
  highlightedHtml,
  language,
  preClassName,
}: {
  rawCode: string;
  highlightedHtml: string;
  language?: string;
  preClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(rawCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    } else {
      console.warn('Clipboard API not available.');
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 bg-muted/80 hover:bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-muted shadow transition"
        aria-label="Copy code"
        type="button"
      >
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
      <pre className={preClassName}>
        <code
          className={language ? `language-${language}` : undefined}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}

// Helper to create React elements with basic attributes
function createReactElement(element: HTMLElement, children: React.ReactNode[], key: string): React.ReactElement {
  const props: { [key: string]: any } = { key };
  if (element.id) props.id = element.id;
  if (element.className) props.className = element.className;
  // Add more attributes if essential, e.g., href for <a>, src for <img>
  // Be cautious with general attribute mapping. For complex cases, a library like html-to-react might be better.
  return React.createElement(element.tagName.toLowerCase(), props, ...children.filter(child => child !== null && child !== undefined));
}

// Utility to parse HTML on the client and enhance it with CopyableCodeBlock components
function getClientEnhancedJsx(html: string): React.ReactNode {
  // This function assumes it's running on the client where window.DOMParser is available.
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let keyCounter = 0; // Moved keyCounter here to be accessible by the recursive function

  function processNodesRecursive(nodes: NodeListOf<ChildNode>, baseKey: string): React.ReactNode[] {
    const resultNodes: React.ReactNode[] = [];
    Array.from(nodes).forEach((node, index) => {
      const currentKey = `${baseKey}-${index}-${keyCounter++}`;

      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).tagName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeType === Node.ELEMENT_NODE &&
        (node.firstChild as HTMLElement).tagName === 'CODE'
      ) {
        const preEl = node as HTMLElement;
        const codeEl = node.firstChild as HTMLElement;
        
        const rawCode = codeEl.textContent || '';
        const highlightedHtml = codeEl.innerHTML;
        const language = Array.from(codeEl.classList)
          .find((cls) => cls.startsWith('language-'))
          ?.replace('language-', '');
        const preClassName = preEl.className;

        resultNodes.push(
          <CopyableCodeBlock
            key={`cb-${currentKey}`}
            rawCode={rawCode}
            highlightedHtml={highlightedHtml}
            language={language}
            preClassName={preClassName}
          />
        );
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const processedChildren = processNodesRecursive(element.childNodes, `children-of-${currentKey}`);
        
        const containsCustomComponent = processedChildren.some(
          child => React.isValidElement(child) && typeof child.type !== 'string' // Check if it's a custom component like CopyableCodeBlock
        );

        if (containsCustomComponent) {
          // If children include a custom component, reconstruct this element with React.createElement
          resultNodes.push(createReactElement(element, processedChildren, `el-${currentKey}`));
        } else {
          // If no children were transformed, use outerHTML but wrap in a div for block context
          // This ensures that block elements are not improperly wrapped in spans.
          resultNodes.push(
            <div 
              key={`html-${currentKey}`}
              dangerouslySetInnerHTML={{ __html: element.outerHTML }}
            />
          );
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        // Only add non-empty text nodes to avoid issues with React rendering empty strings
        if (node.textContent && node.textContent.trim() !== '') {
             resultNodes.push(node.textContent);
        }
      }
      // Other node types (e.g., comments) are ignored.
    });
    return resultNodes;
  }

  const enhancedNodes = processNodesRecursive(doc.body.childNodes, 'root');
  return <>{enhancedNodes}</>;
}

/**
 * ArticleContent component renders the main content of a blog article.
 * Expects HTML content (already parsed from markdown) as a prop.
 * Uses a two-pass render to avoid hydration mismatches:
 * 1. Initial render (server & client): Renders raw HTML inside a div.
 * 2. After mount (client-only): Re-renders with JSX enhanced with CopyableCodeBlocks.
 */
export function ArticleContent({ html }: { html: string }) {
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    // Delay interactive features to prioritize initial render
    const timer = setTimeout(() => setIsInteractive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // For initial render, use simple HTML injection for speed
  if (!isInteractive) {
    return (
      <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r prose-img:rounded-lg prose-img:shadow-md prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-th:text-left prose-td:border-muted prose-th:border-muted">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    );
  }

  // Enhanced version with interactive features
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r prose-img:rounded-lg prose-img:shadow-md prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-th:text-left prose-td:border-muted prose-th:border-muted">
      {getClientEnhancedJsx(html)}
    </article>
  );
}
