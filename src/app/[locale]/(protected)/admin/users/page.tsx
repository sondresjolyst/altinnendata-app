"use client";

import { AdminUsersPanel } from '@sjolystinnovation/app-kit/admin';
import { nbAdminUsersPanelStrings } from '@sjolystinnovation/app-kit/locales/nb';
import AdminService from '@/services/adminService';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminUsersPage() {
    const { locale } = useDictionary();

    return <AdminUsersPanel service={AdminService} strings={locale === 'no' ? nbAdminUsersPanelStrings : undefined} />;
}
