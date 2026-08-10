import { z } from 'zod';
import type { Dictionary } from '@/i18n/dictionaries';

export const contactSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(30).optional().or(z.literal('')),
    useCase: z.string().max(160).optional().or(z.literal('')),
    budgetNok: z.number().int().min(0).nullable().optional(),
    buildSlug: z.string().max(160).optional().or(z.literal('')),
    message: z.string().min(1).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const passwordSchema = z
    .string()
    .min(8)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/);

/** Maps a Zod issue to a message in the visitor's language; Zod's own text is always English. */
export function issueMessage(issue: z.core.$ZodIssue, dict: Dictionary): string {
    if (issue.code === 'invalid_format' && issue.format === 'email') return dict.validation.email;
    if (issue.code === 'too_big') return dict.validation.tooLong;
    return dict.validation.required;
}

export function fieldErrors<T extends Record<string, unknown>>(
    error: z.ZodError<T>,
    dict: Dictionary,
): Partial<Record<keyof T, string>> {
    const errors: Partial<Record<keyof T, string>> = {};
    for (const issue of error.issues) {
        const key = issue.path[0] as keyof T;
        if (key != null && errors[key] === undefined) errors[key] = issueMessage(issue, dict);
    }
    return errors;
}
