import { request } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';

export type EnquiryStatus = 'New' | 'InProgress' | 'Answered' | 'Done';

export interface Assignee {
    id: string;
    name: string;
}

export interface EnquirySummary {
    id: number;
    createdAt: string;
    name: string;
    buildTitle: string | null;
    useCase: string | null;
    status: EnquiryStatus;
    /** The owner, or null when the enquiry has none or its owner is no longer an active admin. */
    owner: Assignee | null;
    /** Whether the enquiry lost its owner because they stopped being an admin. */
    ownerRemoved: boolean;
}

export interface Enquiry extends EnquirySummary {
    email: string;
    phone: string | null;
    budgetNok: string | null;
    buildSlug: string | null;
    locale: string;
    message: string;
    receiptSent: boolean;
    noticeSentAt: string | null;
    updatedAt: string;
}

export interface EnquiryPage {
    items: EnquirySummary[];
    total: number;
}

export interface EnquiryListParams {
    /** The statuses to show. The API leaves out Done when none are given. */
    status?: EnquiryStatus[];
    mine?: boolean;
    q?: string;
    page?: number;
}

export interface EnquiryUpdate {
    status?: EnquiryStatus;
    /** The owner changes only when this is true. */
    setOwner?: boolean;
    assignedUserId?: string | null;
    /** The owner the page saw, so the API can refuse a take-over made on stale data. */
    expectedAssignedUserId?: string | null;
}

export type EnquiryUpdateResult = { ok: true; enquiry: Enquiry } | { ok: false; conflict: Enquiry };

// The API reads repeated keys, so the statuses are not sent as status[].
const query = ({ status, mine, q, page }: EnquiryListParams) => {
    const search = new URLSearchParams();
    status?.forEach(value => search.append('status', value));
    if (mine) search.set('mine', 'true');
    if (q) search.set('q', q);
    if (page) search.set('page', String(page));
    const text = search.toString();
    return text ? `?${text}` : '';
};

const EnquiryService = {
    list: (params: EnquiryListParams) =>
        request(() => axiosInstance.get<EnquiryPage>(`/admin/enquiries${query(params)}`), 'Failed to load the enquiries'),

    /** The number of enquiries that are New. */
    count: async () => {
        const { new: count } = await request(() => axiosInstance.get<{ new: number }>('/admin/enquiries/count'), 'Failed to load the enquiry count');
        return count;
    },

    assignees: () =>
        request(() => axiosInstance.get<Assignee[]>('/admin/enquiries/assignees'), 'Failed to load the admins'),

    get: (id: number) =>
        request(() => axiosInstance.get<Enquiry>(`/admin/enquiries/${id}`), 'Failed to load the enquiry'),

    /** A 409 means the owner changed since the page loaded. It resolves to the current enquiry instead of throwing. */
    update: async (id: number, body: EnquiryUpdate): Promise<EnquiryUpdateResult> => {
        const response = await request(
            () =>
                axiosInstance
                    .patch<Enquiry>(`/admin/enquiries/${id}`, body, { validateStatus: status => status < 400 || status === 409 })
                    .then(data => ({ data })),
            'Failed to update the enquiry',
        );
        return response.status === 409 ? { ok: false, conflict: response.data } : { ok: true, enquiry: response.data };
    },

    remove: async (id: number) => {
        await request(() => axiosInstance.delete(`/admin/enquiries/${id}`), 'Failed to delete the enquiry');
    },
};

export default EnquiryService;
