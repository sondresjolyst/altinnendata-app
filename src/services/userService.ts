import { createUserService } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';
import publicClient from './publicClient';

export type { UserProfile } from '@sjolystinnovation/app-kit/api';

const UserService = createUserService(axiosInstance, publicClient);

export default UserService;
