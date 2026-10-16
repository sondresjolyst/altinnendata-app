import { createLegalService, type LegalPage as AppKitLegalPage } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';
import publicClient from './publicClient';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';

export const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;

export type LegalKey = (typeof LEGAL_KEYS)[number];

export type LegalPage = AppKitLegalPage<LegalKey>;

const LegalService = createLegalService<LegalKey>(axiosInstance, publicClient, {
    onSaved: () => revalidateTarget(REVALIDATE_TARGETS.legal),
});

export default LegalService;
