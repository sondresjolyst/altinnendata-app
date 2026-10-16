"use client";

import { AdminUsersPanel } from '@sjolystinnovation/app-kit/admin';
import AdminService from '@/services/adminService';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminUsersPage() {
    const { dict } = useDictionary();

    return (
        <AdminUsersPanel
            service={AdminService}
            getRoles={AdminService.getRoles}
            strings={{
                users: dict.admin.users,
                showDeleted: dict.admin.showDeleted,
                inviteUser: dict.admin.inviteUser,
                firstName: dict.admin.firstName,
                lastName: dict.admin.lastName,
                email: dict.auth.email,
                role: dict.admin.role,
                sendInvite: dict.admin.sendInvite,
                sending: dict.admin.sending,
                inviteHint: dict.admin.inviteHint,
                loading: dict.common.loading,
                deleted: dict.admin.deletedTag,
                delete: dict.common.delete,
                remove: dict.common.remove,
                noRoles: dict.admin.noRoles,
                addRole: dict.admin.addRole,
                add: dict.common.add,
                cancel: dict.common.cancel,
                usersLoadFailed: dict.admin.usersLoadFailed,
                rolesLoadFailed: dict.admin.rolesLoadFailed,
                roleAssigned: dict.admin.roleAssigned,
                roleAssignFailed: dict.admin.roleAssignFailed,
                roleRemoved: dict.admin.roleRemoved,
                roleRemoveFailed: dict.admin.roleRemoveFailed,
                confirmDelete: dict.admin.confirmDeleteUser,
                userDeleted: dict.admin.userDeleted,
                userDeleteFailed: dict.admin.userDeleteFailed,
                inviteIncomplete: dict.admin.inviteIncomplete,
                inviteSent: dict.admin.inviteSentLong,
                inviteFailed: dict.admin.inviteFailed,
            }}
        />
    );
}
