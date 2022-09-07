/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProviderAccountDetail = {
  properties: {
    preferences: {
      type: 'ProviderAccountPreferences',
      description: `User preference values for Auto-Refresh and DataExtracts Notification<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>GET providerAccounts/{providerAccountId}</li></ul>`,
      isReadOnly: true,
    },
    oauthMigrationStatus: {
      type: 'Enum',
      isReadOnly: true,
    },
    isManual: {
      type: 'boolean',
      description: `Indicates whether account is a manual or aggregated provider account.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li><li>GET dataExtracts/userData</li></ul>`,
      isReadOnly: true,
    },
    lastUpdated: {
      type: 'string',
      description: `Indicate when the providerAccount is last updated successfully.<br><br><b>Account Type</b>: Aggregated<br><b>Endpoints</b>:<ul><li>GET dataExtracts/userData</li></ul>`,
      isReadOnly: true,
    },
    consentId: {
      type: 'number',
      description: `Consent Id generated through POST Consent.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li></ul>`,
      isRequired: true,
      format: 'int64',
    },
    loginForm: {
      type: 'array',
      contains: {
        type: 'LoginForm',
      },
      isReadOnly: true,
    },
    createdDate: {
      type: 'string',
      description: `The date on when the provider account is created in the system.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li></ul>`,
      isReadOnly: true,
    },
    aggregationSource: {
      type: 'Enum',
      isReadOnly: true,
    },
    providerId: {
      type: 'number',
      description: `Unique identifier for the provider resource. This denotes the provider for which the provider account id is generated by the user.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li><li>GET dataExtracts/userData</li></ul>`,
      isReadOnly: true,
      format: 'int64',
    },
    requestId: {
      type: 'string',
      description: `Unique id generated to indicate the request.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li></ul>`,
      isReadOnly: true,
    },
    id: {
      type: 'number',
      description: `Unique identifier for the provider account resource. This is created during account addition.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li><li>POST providerAccounts</li><li>PUT providerAccounts/{providerAccountId}</li><li>GET providerAccounts/{providerAccountId}</li><li>GET dataExtracts/userData</li></ul>`,
      isReadOnly: true,
      format: 'int64',
    },
    dataset: {
      type: 'array',
      contains: {
        type: 'AccountDataset',
      },
      isReadOnly: true,
    },
    status: {
      type: 'Enum',
      isReadOnly: true,
    },
  },
} as const;
