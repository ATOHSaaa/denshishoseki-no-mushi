/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_AMAZON_ASSOCIATE_TAG: string;
  readonly AMAZON_CREATORS_API_ACCESS_KEY: string;
  readonly AMAZON_CREATORS_API_SECRET_KEY: string;
  readonly AMAZON_CREATORS_API_PARTNER_TAG: string;
  readonly AMAZON_CREDENTIAL_ID: string;
  readonly AMAZON_CREDENTIAL_SECRET: string;
  readonly PUBLIC_CLARITY_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
