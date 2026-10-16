import { createSettingsService, type SiteSettings } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';

export type Settings = SiteSettings;

const SettingsService = createSettingsService(axiosInstance);

export default SettingsService;
