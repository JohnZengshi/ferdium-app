/**
 * Auth system type definitions.
 * Strategy Pattern-based pluggable auth for Ferdium.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Authentication provider types */
export enum AuthProviderType {
  FERDIUM = 'ferdium',
  NEXTAUTH = 'nextauth',
  OAUTH = 'oauth',
  CUSTOM = 'custom',
}

/** Form field types for dynamic login forms */
export enum AuthFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  TEL = 'tel',
  SELECT = 'select',
  HIDDEN = 'hidden',
}

/** Authentication result status codes */
export enum AuthResultStatus {
  SUCCESS = 'success',
  INVALID_CREDENTIALS = 'invalid_credentials',
  NETWORK_ERROR = 'network_error',
  CSRF_ERROR = 'csrf_error',
  SESSION_ERROR = 'session_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/** Auth event types for the event emitter */
export enum AuthEventType {
  LOGIN_START = 'login_start',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PROVIDER_CHANGED = 'provider_changed',
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** A single form field in an auth config */
export interface AuthField {
  /** Unique field identifier (e.g. 'email', 'password') */
  id: string;
  /** HTML input type */
  type: AuthFieldType;
  /** Display label (can be i18n key) */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Validation functions (names or references) */
  validators?: string[];
  /** Default value for hidden fields */
  defaultValue?: string;
  /** Options for SELECT fields */
  options?: { label: string; value: string }[];
}

/** A link shown below the login form (signup, forgot password, OAuth, etc.) */
export interface AuthLink {
  /** Display text */
  label: string;
  /** URL or route */
  href: string;
  /** Visual variant: 'primary' | 'secondary' | 'text' */
  variant?: 'primary' | 'secondary' | 'text';
  /** Optional click handler (for OAuth buttons etc.) */
  onClick?: () => void;
}

/** Configuration that defines how the login form looks and behaves */
export interface AuthConfig {
  /** Form fields to render */
  fields: AuthField[];
  /** Whether to show the "Create account" link */
  showSignup: boolean;
  /** Whether to show the "Forgot password" link */
  showForgotPassword: boolean;
  /** Label for the submit button */
  submitLabel: string;
  /** Additional links below the form */
  extraLinks?: AuthLink[];
  /** Optional header text above the form */
  headerText?: string;
  /** Optional footer text below the form */
  footerText?: string;
}

/** Result returned by an auth provider's authenticate method */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** JWT or session token (for Ferdium auth) */
  token?: string;
  /** API key (for NextAuth-based auth) */
  apiKey?: string;
  /** Error message if authentication failed */
  error?: string;
  /** Structured status code */
  status: AuthResultStatus;
}

/** Event emitted by the AuthManager */
export interface AuthEvent {
  /** Event type */
  type: AuthEventType;
  /** Provider that triggered the event */
  provider?: string;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/** Contract that all auth providers must implement */
export interface AuthProvider {
  /** Unique provider name (e.g. 'ferdium', 'nextauth') */
  name: string;
  /** Provider type enum */
  type: AuthProviderType;
  /** UI configuration for the login form */
  config: AuthConfig;
  /**
   * Authenticate with the given credentials.
   * @param credentials - Key-value pairs from the login form
   * @returns AuthResult with success status and token/apiKey
   */
  authenticate(credentials: Record<string, string>): Promise<AuthResult>;
  /**
   * Log out and clear session state.
   */
  logout(): Promise<void>;
  /**
   * Get the Authorization header value for API requests.
   * @returns e.g. 'Bearer <token>' or null if not authenticated
   */
  getAuthHeader(): string | null;
  /**
   * Check if the user is currently authenticated.
   */
  isAuthenticated(): boolean;
}

/** Manager interface for the singleton AuthManager */
export interface IAuthManager {
  /** Register a new auth provider */
  registerProvider(provider: AuthProvider): void;
  /** Unregister an auth provider by name */
  unregisterProvider(name: string): void;
  /** Set the active auth provider by name */
  setActiveProvider(name: string): void;
  /** Get the currently active auth provider */
  getActiveProvider(): AuthProvider | null;
  /** Get all registered providers */
  getProviders(): AuthProvider[];
  /** Get a specific provider by name */
  getProvider(name: string): AuthProvider | undefined;
  /** Authenticate using the active provider */
  authenticate(credentials: Record<string, string>): Promise<AuthResult>;
  /** Log out using the active provider */
  logout(): Promise<void>;
  /** Get the auth header from the active provider */
  getAuthHeader(): string | null;
  /** Check if the active provider is authenticated */
  isAuthenticated(): boolean;
  /** Subscribe to auth events */
  on(event: AuthEventType, listener: AuthEventListener): void;
  /** Unsubscribe from auth events */
  off(event: AuthEventType, listener: AuthEventListener): void;
  /** Get the name of the active provider */
  getActiveProviderName(): string | null;
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/** Partial credentials (for partial form fills) */
export type PartialCredentials = Partial<Record<string, string>>;

/** Factory function type for creating auth providers */
export type AuthAuthProviderFactory = () => AuthProvider;

/** Configuration for initializing the AuthManager */
export interface AuthManagerConfig {
  /** Default provider to activate on startup */
  defaultProvider?: string;
  /** localStorage key for persisting the active provider */
  storageKey?: string;
}

/** Event listener function type */
export type AuthEventListener = (event: AuthEvent) => void;
