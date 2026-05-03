import { CodeBlock } from '../CodeBlock';

const DEFAULT_CODE = `import { Button, Input } from '@your-scope/ui-kit';

export function Panel() {
    return (
        <form>
            <Input label="Проект" placeholder="UI-кит" />
            <Button>Сохранить</Button>
        </form>
    );
}`;

export function Code({
    code = DEFAULT_CODE,
    language = 'jsx',
    filename,
    variant = 'editor',
}) {
    return (
        <CodeBlock
            code={code}
            language={language}
            filename={filename || (variant === 'terminal' ? 'terminal' : 'example.jsx')}
            variant={variant}
        />
    );
}
