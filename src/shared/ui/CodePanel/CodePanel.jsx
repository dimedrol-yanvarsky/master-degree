import { CodeBlock } from '../CodeBlock';

const DEFAULT_CODE = `export function Example() {
    return <Button>Сохранить</Button>;
}`;

export function CodePanel({ code = DEFAULT_CODE, variant = 'editor', filename = 'example.jsx' }) {
    return <CodeBlock code={code} variant={variant} filename={filename} />;
}
