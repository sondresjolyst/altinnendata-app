import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// Explicit classes rather than `prose`: the Tailwind typography plugin is not
// installed, so without these the CSS reset renders headings as body text.
const COMPONENTS: Components = {
    h1: props => <h2 className="text-lg font-semibold text-gray-900" {...props} />,
    h2: props => <h2 className="text-base font-semibold text-gray-900 pt-2" {...props} />,
    h3: props => <h3 className="text-sm font-semibold text-gray-900" {...props} />,
    p: props => <p className="leading-relaxed" {...props} />,
    ul: props => <ul className="list-disc list-outside pl-5 space-y-1" {...props} />,
    ol: props => <ol className="list-decimal list-outside pl-5 space-y-1" {...props} />,
    li: props => <li className="leading-relaxed" {...props} />,
    a: props => <a className="font-medium text-gray-900 underline hover:text-gray-600" {...props} />,
    strong: props => <strong className="font-semibold text-gray-900" {...props} />,
    hr: props => <hr className="border-gray-200" {...props} />,
    blockquote: props => <blockquote className="border-l-2 border-gray-200 pl-4 italic" {...props} />,
    code: props => <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono text-gray-900" {...props} />,
    table: props => (
        <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" {...props} />
        </div>
    ),
    thead: props => <thead className="border-b border-gray-200" {...props} />,
    tbody: props => <tbody className="divide-y divide-gray-200" {...props} />,
    th: props => <th className="text-left py-2 pr-4 font-semibold text-gray-900" {...props} />,
    td: props => <td className="py-2 pr-4 align-top" {...props} />,
};

export default function Markdown({ children }: { children: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={COMPONENTS}>
            {children}
        </ReactMarkdown>
    );
}
