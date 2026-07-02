import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

/**
 * Markdown → HTML rendering, shared by the export toolbar and the MCP
 * `markdown_to_html` tool. Pure — no React/DOM.
 */

export interface RenderHtmlOptions {
  /** Wrap in a standalone styled document (the export/print stylesheet). */
  styled?: boolean;
  /** <title> for the styled document. */
  title?: string;
}

export async function renderMarkdownToHtml(
  markdown: string,
  { styled = true, title = "document" }: RenderHtmlOptions = {},
): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml)
    .process(markdown);

  const htmlContent = result.toString();
  if (!styled) return htmlContent;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #fff;
        }

        h1, h2, h3, h4, h5, h6 {
            color: #2d3748;
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }

        h1 { font-size: 2.25rem; }
        h2 { font-size: 1.875rem; }
        h3 { font-size: 1.5rem; }

        p {
            margin-bottom: 1rem;
        }

        code {
            background: #f7fafc;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            font-size: 0.875em;
        }

        pre {
            background: #2d3748;
            color: #fff;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
        }

        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }

        blockquote {
            border-left: 4px solid #e2e8f0;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #718096;
        }

        ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
        }

        li {
            margin: 0.5rem 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.5rem 1rem;
            text-align: left;
        }

        th {
            background: #f7fafc;
            font-weight: 600;
        }

        a {
            color: #3182ce;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        @media print {
            body {
                max-width: none;
                margin: 0;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}
