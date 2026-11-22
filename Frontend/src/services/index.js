// One import point for the pages. In live mode (default) every service calls the Express API;
// with VITE_USE_MOCK=true the browser-local mock implementations in ./mock are used instead.
import { USE_MOCK } from './config';
import * as live from './liveServices';
import * as mock from './mockServices';

const pick = (name) => (USE_MOCK ? mock : live)[name];

export const authService = pick('authService');
export const profileService = pick('profileService');
export const categoryService = pick('categoryService');
export const serviceService = pick('serviceService');
export const orderService = pick('orderService');
export const reviewService = pick('reviewService');
export const notificationService = pick('notificationService');
export const reportService = pick('reportService');
export const dashboardService = pick('dashboardService');
export const adminService = pick('adminService');
export { allowedActions } from './orderTransitions';
export { USE_MOCK } from './config';
export { resetMockDb } from './mockDb';
