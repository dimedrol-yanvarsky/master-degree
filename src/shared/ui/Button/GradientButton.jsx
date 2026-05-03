import { Button } from './Button';

export function GradientButton({ gradient = 'radial', children = 'Градиентное действие', ...props }) {
    return (
        <Button
            {...props}
            variant="gradient"
            gradient={gradient}>
            {children}
        </Button>
    );
}
