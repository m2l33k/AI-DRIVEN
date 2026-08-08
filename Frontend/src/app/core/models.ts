export type LoginStatus = 'SUCCESS' | 'EMAIL_VERIFICATION_REQUIRED' | 'PASSWORD_CHANGE_REQUIRED';

export interface LoginResponse {
  status: LoginStatus;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  firstLoginToken?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export type RealmRole = 'PLATFORM_ADMIN' | 'NETWORK_OPERATOR' | 'SECURITY_ANALYST' | 'AUDITOR';

export interface CurrentUser {
  username: string;
  name: string;
  email: string;
  roles: string[];
}
