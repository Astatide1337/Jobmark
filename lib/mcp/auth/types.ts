import { z } from 'zod';

export const OAuthScopes = [
  'jobmark:read',
  'jobmark:write',
  'jobmark:destructive',
  'offline_access',
] as const;

export type OAuthScope = (typeof OAuthScopes)[number];

export const ClientSchema = z.object({
  client_id: z.string(),
  client_secret: z.string().optional(),
  redirect_uris: z.array(z.string().url()),
  grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])),
  response_types: z.array(z.enum(['code'])),
  scope: z.string(),
  token_endpoint_auth_method: z
    .enum(['client_secret_post', 'client_secret_basic', 'none'])
    .default('client_secret_post'),
  jwks_uri: z.string().url().optional(),
  client_name: z.string().optional(),
  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  scope_space_delimited: z.boolean().default(true),
});

export type Client = z.infer<typeof ClientSchema>;

export const AuthorizationCodeSchema = z.object({
  code: z.string(),
  client_id: z.string(),
  user_id: z.string(),
  redirect_uri: z.string().url(),
  code_challenge: z.string(),
  code_challenge_method: z.enum(['S256']),
  scope: z.string(),
  expires_at: z.number(),
  state: z.string().optional(),
  pkce_code_verifier: z.string().optional(),
});

export type AuthorizationCode = z.infer<typeof AuthorizationCodeSchema>;

export const AccessTokenSchema = z.object({
  token: z.string(),
  client_id: z.string(),
  user_id: z.string(),
  scope: z.string(),
  expires_at: z.number(),
  token_type: z.literal('Bearer'),
});

export type AccessToken = z.infer<typeof AccessTokenSchema>;

export const RefreshTokenSchema = z.object({
  token: z.string(),
  client_id: z.string(),
  user_id: z.string(),
  scope: z.string(),
  expires_at: z.number(),
  rotated_from: z.string().optional(),
  pkce_code_verifier: z.string().optional(),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

export const JWKSSchema = z.object({
  keys: z.array(
    z.object({
      kty: z.literal('RSA'),
      use: z.literal('sig'),
      kid: z.string(),
      n: z.string(),
      e: z.string(),
      alg: z.literal('RS256'),
    })
  ),
});

export type JWKS = z.infer<typeof JWKSSchema>;

export const WellKnownAuthServerSchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  revocation_endpoint: z.string().url(),
  introspection_endpoint: z.string().url(),
  jwks_uri: z.string().url().optional(),
  registration_endpoint: z.string().url().optional(),
  scopes_supported: z.array(z.string()),
  response_types_supported: z.array(z.string()),
  response_modes_supported: z.array(z.string()),
  grant_types_supported: z.array(z.string()),
  code_challenge_methods_supported: z.array(z.string()),
  token_endpoint_auth_methods_supported: z.array(z.string()),
  token_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
  service_documentation: z.string().url().optional(),
  ui_locales_supported: z.array(z.string()).optional(),
  op_policy_uri: z.string().url().optional(),
  op_tos_uri: z.string().url().optional(),
  client_id_metadata_document_supported: z.boolean().optional(),
});

export type WellKnownAuthServer = z.infer<typeof WellKnownAuthServerSchema>;

export const WellKnownProtectedResourceSchema = z.object({
  resource: z.string().url(),
  authorization_servers: z.array(z.string().url()),
  jwks_uri: z.string().url().optional(),
  scopes_supported: z.array(z.string()),
  bearer_methods_supported: z.array(z.string()),
  resource_documentation: z.string().url().optional(),
});

export type WellKnownProtectedResource = z.infer<typeof WellKnownProtectedResourceSchema>;
