import { ProviderName } from './types.js';

export type ExternalCommerceErrorCode =
  | 'INVALID_SEARCH_QUERY'
  | 'EXTERNAL_PROVIDER_NOT_CONFIGURED'
  | 'EXTERNAL_PROVIDER_UNAVAILABLE'
  | 'EXTERNAL_PROVIDER_TIMEOUT'
  | 'NORMALIZATION_ERROR'
  | 'CACHE_STORAGE_ERROR'
  | 'PRODUCT_NOT_FOUND';

export class ExternalCommerceError extends Error {
  public readonly code: ExternalCommerceErrorCode;
  public readonly provider?: ProviderName;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: ExternalCommerceErrorCode;
    message: string;
    provider?: ProviderName;
    statusCode?: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'ExternalCommerceError';
    this.code = params.code;
    this.provider = params.provider;
    this.statusCode = params.statusCode || 500;
    this.details = params.details;
  }
}
