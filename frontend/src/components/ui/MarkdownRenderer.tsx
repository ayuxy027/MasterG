import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className = '',
    style = {},
    fontFamily = 'Inter',
    fontSize = 14,
    isBold = false,
    isItalic = false,
    isUnderline = false,
    color = '#2c3e50'
}) => {
    // Combine custom styles with text styling props
    const combinedStyle: React.CSSProperties = {
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: '1.4',
        color,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        textDecoration: isUnderline ? 'underline' : 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style
    };

    // Custom components to maintain styling consistency
    const components: Components = {
        // Headers
        h1: ({ children, ...props }) => (
            <h1 {...props} style={{ fontSize: `${fontSize * 1.5}px`, fontWeight: 'bold', margin: '4px 0 2px 0' }}>
                {children}
            </h1>
        ),
        h2: ({ children, ...props }) => (
            <h2 {...props} style={{ fontSize: `${fontSize * 1.3}px`, fontWeight: 'bold', margin: '3px 0 1px 0' }}>
                {children}
            </h2>
        ),
        h3: ({ children, ...props }) => (
            <h3 {...props} style={{ fontSize: `${fontSize * 1.1}px`, fontWeight: 'bold', margin: '2px 0 1px 0' }}>
                {children}
            </h3>
        ),

        // Lists
        ul: ({ children, ...props }) => (
            <ul {...props} style={{ margin: '2px 0', paddingLeft: '16px' }}>
                {children}
            </ul>
        ),
        ol: ({ children, ...props }) => (
            <ol {...props} style={{ margin: '2px 0', paddingLeft: '16px' }}>
                {children}
            </ol>
        ),
        li: ({ children, ...props }) => (
            <li {...props} style={{ margin: '1px 0' }}>
                {children}
            </li>
        ),

        // Emphasis
        strong: ({ children, ...props }) => (
            <strong {...props} style={{ fontWeight: 'bold' }}>
                {children}
            </strong>
        ),
        em: ({ children, ...props }) => (
            <em {...props} style={{ fontStyle: 'italic' }}>
                {children}
            </em>
        ),

        // Code
        code: ({ children, ...props }) => (
            <code {...props} style={{
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: '2px 4px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: `${fontSize * 0.9}px`
            }}>
                {children}
            </code>
        ),

        // Paragraphs
        p: ({ children, ...props }) => (
            <p {...props} style={{ margin: '2px 0' }}>
                {children}
            </p>
        ),

        // Blockquotes
        blockquote: ({ children, ...props }) => (
            <blockquote {...props} style={{
                borderLeft: '3px solid #ddd',
                margin: '2px 0',
                paddingLeft: '8px',
                fontStyle: 'italic',
                color: 'rgba(44,62,80,0.7)'
            }}>
                {children}
            </blockquote>
        ),
    };

    return (
        <div className={className} style={combinedStyle}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;

