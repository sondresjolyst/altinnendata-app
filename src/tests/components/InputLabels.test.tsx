import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import TextArea from '@/components/TextArea';
import { PasswordInput, TextInput } from '@sjolystinnovation/app-kit/ui';
// Every long admin form passes a label and nothing else, so the components have to associate
// the two themselves or the field is unidentifiable to a screen reader.
describe('the shared inputs', () => {
    it('ties a label to its input with no id or name given', () => {
        render(<TextInput label="Tittel" />);

        expect(screen.getByLabelText('Tittel')).toBeInstanceOf(HTMLInputElement);
    });

    it('ties a label to its textarea with no id or name given', () => {
        render(<TextArea label="Ingress" />);

        expect(screen.getByLabelText('Ingress')).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('ties a label to its password field with no id or name given', () => {
        render(<PasswordInput label="Passord" />);

        expect(screen.getByLabelText(/^Passord/)).toBeInstanceOf(HTMLInputElement);
    });

    it('gives two inputs on one page distinct ids', () => {
        render(
            <>
                <TextInput label="Mengde" />
                <TextInput label="Enhet" />
            </>,
        );

        const first = screen.getByLabelText('Mengde');
        const second = screen.getByLabelText('Enhet');
        expect(first.id).not.toBe('');
        expect(first.id).not.toBe(second.id);
    });

    it('marks a required password the way a required text field is marked', () => {
        render(<PasswordInput label="Passord" required />);

        expect(screen.getByLabelText(/Passord/)).toHaveAttribute('aria-required', 'true');
        expect(screen.getByText('*')).toBeInTheDocument();
    });
});
