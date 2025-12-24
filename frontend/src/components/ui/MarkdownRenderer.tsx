import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  // Text styling props to maintain compatibility
  fontFamily?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: string;
}

/**
 * MarkdownRenderer - Renders markdown with full LaTeX/math support
 *
 * Supports:
 * - Inline math: $E = mc^2$ or \(E = mc^2\)
 * - Block math: $$\int_0^1 x^2 dx$$ or \[...\]
 * - Chemical equations: $\text{NaCl} + \text{AgNO}_3$
 * - GFM (tables, strikethrough, etc.)
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  style = {},
  fontFamily = "Inter",
  fontSize = 14,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  color = "#2c3e50",
}) => {
  // Pre-process content to handle various LaTeX formats
  const processedContent = preprocessLatex(content);

  // Combine custom styles with text styling props
  const combinedStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: "1.6",
    color,
    fontWeight: isBold ? "bold" : "normal",
    fontStyle: isItalic ? "italic" : "normal",
    textDecoration: isUnderline ? "underline" : "none",
    wordBreak: "break-word",
    ...style,
  };

  // No inline styles needed - global CSS handles KaTeX
  const katexStyleFix = ``;

  // Custom components to maintain styling consistency
  const components: Components = {
    // ... (rest of components remain same, just patching the start of function)
    // Headers with proper spacing
    h1: ({ children, ...props }) => (
      <h1
        {...props}
        style={{
          fontSize: `${fontSize * 1.5}px`,
          fontWeight: "bold",
          margin: "16px 0 8px 0",
          lineHeight: "1.3",
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        {...props}
        style={{
          fontSize: `${fontSize * 1.3}px`,
          fontWeight: "bold",
          margin: "14px 0 6px 0",
          lineHeight: "1.3",
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        {...props}
        style={{
          fontSize: `${fontSize * 1.15}px`,
          fontWeight: "bold",
          margin: "12px 0 4px 0",
          lineHeight: "1.3",
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        {...props}
        style={{
          fontSize: `${fontSize * 1.05}px`,
          fontWeight: "bold",
          margin: "10px 0 4px 0",
          lineHeight: "1.3",
        }}
      >
        {children}
      </h4>
    ),

    // Lists with proper spacing
    ul: ({ children, ...props }) => (
      <ul
        {...props}
        style={{
          margin: "8px 0",
          paddingLeft: "20px",
          listStyleType: "disc",
        }}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        {...props}
        style={{
          margin: "8px 0",
          paddingLeft: "20px",
          listStyleType: "decimal",
        }}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li
        {...props}
        style={{
          margin: "4px 0",
          lineHeight: "1.5",
        }}
      >
        {children}
      </li>
    ),

    // Emphasis
    strong: ({ children, ...props }) => (
      <strong {...props} style={{ fontWeight: "600" }}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em {...props} style={{ fontStyle: "italic" }}>
        {children}
      </em>
    ),

    // Code blocks
    code: ({ children, className: codeClassName, ...props }) => {
      const isInline = !codeClassName;
      if (isInline) {
        return (
          <code
            {...props}
            style={{
              backgroundColor: "rgba(234, 88, 12, 0.1)",
              color: "#ea580c",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: `${fontSize * 0.9}px`,
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          {...props}
          className={codeClassName}
          style={{
            display: "block",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            padding: "12px 16px",
            borderRadius: "8px",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: `${fontSize * 0.9}px`,
            overflowX: "auto",
            margin: "8px 0",
          }}
        >
          {children}
        </code>
      );
    },

    // Pre for code blocks
    pre: ({ children, ...props }) => (
      <pre
        {...props}
        style={{
          margin: "12px 0",
          padding: 0,
          backgroundColor: "transparent",
        }}
      >
        {children}
      </pre>
    ),

    // Paragraphs with proper spacing
    p: ({ children, ...props }) => (
      <p
        {...props}
        style={{
          margin: "8px 0",
          lineHeight: "1.6",
        }}
      >
        {children}
      </p>
    ),

    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        style={{
          borderLeft: "4px solid #ea580c",
          margin: "12px 0",
          paddingLeft: "16px",
          paddingTop: "8px",
          paddingBottom: "8px",
          backgroundColor: "rgba(234, 88, 12, 0.05)",
          borderRadius: "0 8px 8px 0",
          fontStyle: "italic",
          color: "rgba(44,62,80,0.85)",
        }}
      >
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ children, ...props }) => (
      <div style={{ overflowX: "auto", margin: "12px 0" }}>
        <table
          {...props}
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: `${fontSize}px`,
          }}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        {...props}
        style={{
          backgroundColor: "rgba(234, 88, 12, 0.1)",
          border: "1px solid #e5e7eb",
          padding: "8px 12px",
          fontWeight: "600",
          textAlign: "left",
        }}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        {...props}
        style={{
          border: "1px solid #e5e7eb",
          padding: "8px 12px",
        }}
      >
        {children}
      </td>
    ),

    // Horizontal rule
    hr: ({ ...props }) => (
      <hr
        {...props}
        style={{
          border: "none",
          borderTop: "2px solid #e5e7eb",
          margin: "16px 0",
        }}
      />
    ),

    // Links
    a: ({ children, href, ...props }) => (
      <a
        {...props}
        href={href}
        style={{
          color: "#ea580c",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  return (
    <div className={`markdown-content ${className}`} style={combinedStyle}>
      <style>{katexStyleFix}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Pre-process LaTeX content to ensure proper rendering
 * Handles various LaTeX formats and edge cases
 */
function preprocessLatex(content: string): string {
  if (!content) return "";

  let processed = content;

  // Convert \[ ... \] to $$ ... $$ (block math) - Use tighter spacing
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, "$$$1$$");

  // Convert \( ... \) to $ ... $ (inline math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$");

  // Handle standalone [ ... ] that contains LaTeX (common AI output format)
  // Only convert if it looks like LaTeX (contains backslashes)
  processed = processed.replace(
    /^\[\s*\n([\s\S]*?)\n\s*\]$/gm,
    (match, inner) => {
      if (inner.includes("\\")) {
        return "\n$$\n" + inner.trim() + "\n$$\n";
      }
      return match;
    }
  );

  // Fix common LaTeX issues in AI responses
  // Handle cases where LaTeX is on its own line without delimiters
  processed = processed.replace(/^(\d*\\text\{.*?\\text\{.*?)$/gm, (match) => {
    if (!match.startsWith("$")) {
      return "$$" + match + "$$";
    }
    return match;
  });

  // Clean up multiple newlines (reduce gaps)
  processed = processed.replace(/\n{3,}/g, "\n\n");

  return processed;
}

export default MarkdownRenderer;
