import { formatApiError } from './errors';

export async function request<T>(call: () => Promise<{ data: T }>, fallback: string): Promise<T> {
    try {
        const response = await call();
        return response.data;
    } catch (error: unknown) {
        throw new Error(formatApiError(error, fallback));
    }
}
