import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            roles: string[];
        };
        accessToken: string;
        error?: string;
        absoluteExpiresAt?: number;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        refreshAt?: number;
        refreshToken?: string;
        loginAt?: number;
        user?: {
            id: string;
            name: string;
            email: string;
            roles: string[];
        };
        error?: string;
    }
}
