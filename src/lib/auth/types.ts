/**
 * Auth types for WorkOS integration
 */

export interface AuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
	firstName: string | null;
	lastName: string | null;
	profilePictureUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AuthSession {
	user: AuthUser;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

export interface TenantUser {
	userId: string;
	tenantId: string;
	email: string;
	fullName: string;
	role: 'admin' | 'sales' | 'operations' | 'finance' | 'viewer';
	avatarUrl?: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: TenantUser | null;
	error: string | null;
}

export type AuthRole = 'admin' | 'sales' | 'operations' | 'finance' | 'viewer';

export const ROLE_PERMISSIONS: Record<AuthRole, string[]> = {
	admin: ['*'],
	sales: ['quotations:*', 'clients:read', 'clients:create', 'vehicles:read'],
	operations: ['quotations:read', 'itineraries:*', 'drivers:*', 'vehicles:*'],
	finance: ['quotations:read', 'invoices:*', 'expenses:*', 'reports:*'],
	viewer: ['quotations:read', 'clients:read', 'vehicles:read']
};
