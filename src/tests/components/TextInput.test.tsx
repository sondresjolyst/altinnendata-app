import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextInput from '@/components/TextInput';

describe('TextInput', () => {
    it('reads its error out with the field', () => {
        render(<TextInput label="E-post" name="email" error="Ugyldig e-post" />);
        const input = screen.getByLabelText('E-post');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('Ugyldig e-post');
    });

    it('is not marked invalid without an error', () => {
        render(<TextInput label="E-post" name="email" />);
        expect(screen.getByLabelText('E-post')).not.toHaveAttribute('aria-invalid');
    });
});
