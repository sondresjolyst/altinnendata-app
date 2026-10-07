import { defineSessionConfig } from '@sjolystinnovation/app-kit';

export const sessionConfig = defineSessionConfig({
    jwtSecretEnvVar: 'ALTINNENDATA_API_JWT_SECRET',
    loginRoute: '/login',
    draftStoragePrefix: 'altinnendata',
});
