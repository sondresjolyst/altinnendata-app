import { z } from 'zod';
import type { Dictionary } from '@/i18n/dictionaries';

export const budgetRanges = ['5000-10000', '10000-15000', '15000-25000', '25000+'] as const;
export type BudgetRange = (typeof budgetRanges)[number];

export const contactSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(30).optional().or(z.literal('')),
    useCase: z.string().max(160).optional().or(z.literal('')),
    budgetNok: z.enum(budgetRanges).nullable().optional(),
    buildSlug: z.string().max(160).optional().or(z.literal('')),
    message: z.string().min(1).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function issueMessage(issue: z.core.$ZodIssue, dict: Dictionary): string {
    if (issue.code === 'invalid_format' && issue.format === 'email') return dict.validation.email;
    if (issue.code === 'too_big') return dict.validation.tooLong;
    return dict.validation.required;
}

