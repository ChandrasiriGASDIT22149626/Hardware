import type { UserRole, PageName } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, PageName[]> = {
  super_admin: [
    'dashboard', 'inventory', 'sales', 'purchasing', 
    'customers', 'employees', 'accounting', 'reports', 'settings'
  ],
  admin: [
    'dashboard', 'inventory', 'sales', 'purchasing', 
    'customers', 'employees'
  ],
  retail_user: [
    'dashboard', 'sales', 'customers'
  ]
};