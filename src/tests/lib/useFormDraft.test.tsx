import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFormDraft } from '@/lib/useFormDraft';

const KEY = 'altinnendata:draft:test-form';

function Form({ initialTitle = '', formKey = 'test-form' }: { initialTitle?: string; formKey?: string | null }) {
    const [title, setTitle] = useState(initialTitle);
    const draft = useFormDraft(formKey, { title });

    return (
        <div>
            {draft.pending && (
                <div>
                    <span>draft waiting: {draft.pending.title}</span>
                    <button
                        onClick={() => {
                            setTitle(draft.pending!.title);
                            draft.dismiss();
                        }}
                    >
                        restore
                    </button>
                    <button onClick={() => { draft.clear(); draft.dismiss(); }}>discard</button>
                </div>
            )}
            <input aria-label="title" value={title} onChange={e => setTitle(e.target.value)} />
            <button onClick={draft.clear}>saved</button>
        </div>
    );
}

const stored = () => {
    const raw = window.localStorage.getItem(KEY);
    return raw == null ? null : JSON.parse(raw).value;
};

const storedAt = (value: unknown, savedAt = Date.now()) =>
    window.localStorage.setItem(KEY, JSON.stringify({ savedAt, value }));

const settle = async () => {
    await act(async () => {
        vi.advanceTimersByTime(600);
    });
};

describe('useFormDraft', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => vi.useRealTimers());

    it('stores what the user types so a lost session cannot lose it', async () => {
        render(<Form />);

        await userEvent.type(screen.getByLabelText('title'), 'Fiskesuppe');
        await settle();

        expect(stored()).toEqual({ title: 'Fiskesuppe' });
    });

    it('offers a stored draft instead of applying it', async () => {
        storedAt({ title: 'Halvferdig' });
        render(<Form />);

        expect(await screen.findByText('draft waiting: Halvferdig')).toBeInTheDocument();
        expect(screen.getByLabelText('title')).toHaveValue('');
    });

    it('leaves an unanswered offer alone while the form sits untouched', async () => {
        storedAt({ title: 'Halvferdig' });
        render(<Form />);
        await settle();

        expect(stored()).toEqual({ title: 'Halvferdig' });
    });

    it('still saves new typing while the offer is unanswered', async () => {
        // The reason the offer is held in memory rather than gating the writer: an admin who
        // ignores the banner and types a whole build must not end up with nothing stored.
        storedAt({ title: 'Halvferdig' });
        render(<Form />);

        await userEvent.type(await screen.findByLabelText('title'), 'Noe nytt');
        await settle();

        expect(stored()).toEqual({ title: 'Noe nytt' });
        expect(screen.getByText('draft waiting: Halvferdig')).toBeInTheDocument();
    });

    it('restores the offered draft when the user asks for it', async () => {
        storedAt({ title: 'Halvferdig' });
        render(<Form />);

        await userEvent.click(await screen.findByRole('button', { name: 'restore' }));
        await settle();

        expect(screen.getByLabelText('title')).toHaveValue('Halvferdig');
        expect(screen.queryByText(/draft waiting/)).not.toBeInTheDocument();
    });

    it('drops the draft when the user discards it', async () => {
        storedAt({ title: 'Halvferdig' });
        render(<Form />);

        await userEvent.click(await screen.findByRole('button', { name: 'discard' }));

        expect(stored()).toBeNull();
        expect(screen.queryByText(/draft waiting/)).not.toBeInTheDocument();
    });

    it('does not write an edit form back before the user changes anything', async () => {
        render(<Form initialTitle="Fra API" />);
        await settle();

        expect(stored()).toBeNull();
    });

    it('drops the draft after a successful save', async () => {
        render(<Form />);

        await userEvent.type(screen.getByLabelText('title'), 'Fiskesuppe');
        await settle();
        await userEvent.click(screen.getByRole('button', { name: 'saved' }));

        expect(stored()).toBeNull();
    });

    it('forgets a draft the user abandoned weeks ago', async () => {
        storedAt({ title: 'Glemt' }, Date.now() - 8 * 24 * 60 * 60 * 1000);
        render(<Form />);
        await settle();

        // Unpublished work should not sit in the browser indefinitely, and an eight-day-old
        // draft is not something the user still wants offered.
        expect(screen.queryByText(/draft waiting/)).not.toBeInTheDocument();
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('ignores a stored value it cannot make sense of', async () => {
        window.localStorage.setItem(KEY, 'not json at all');
        render(<Form />);

        await userEvent.type(screen.getByLabelText('title'), 'Ny');
        await settle();

        expect(screen.queryByText(/draft waiting/)).not.toBeInTheDocument();
        expect(stored()).toEqual({ title: 'Ny' });
    });

    it('stores nothing while the signed-in user is unknown', async () => {
        render(<Form formKey={null} />);

        await userEvent.type(screen.getByLabelText('title'), 'Fiskesuppe');
        await settle();

        // A draft keyed without the user would be offered to whoever signs in next on a
        // shared browser profile.
        expect(window.localStorage.length).toBe(0);
    });

    it('does not offer one user the draft another user left behind', async () => {
        storedAt({ title: 'Fra forrige bruker' });

        render(<Form formKey="user-2:test-form" />);
        await settle();

        expect(screen.queryByText(/draft waiting/)).not.toBeInTheDocument();
    });

    it('does not write the draft back after a save', async () => {
        render(<Form />);

        // The debounced write is already scheduled when the user hits save.
        await userEvent.type(screen.getByLabelText('title'), 'Fiskesuppe');
        await userEvent.click(screen.getByRole('button', { name: 'saved' }));
        await settle();

        expect(window.localStorage.getItem(KEY)).toBeNull();
    });
});
