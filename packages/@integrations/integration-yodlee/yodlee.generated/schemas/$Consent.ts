/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Consent = {
  properties: {
    dataAccessFrequency: {
      type: 'Enum',
    },
    titleBody: {
      type: 'string',
      description: `Description for the title.`,
      isRequired: true,
    },
    consentId: {
      type: 'number',
      description: `Consent Id generated through POST Consent.`,
      isRequired: true,
      format: 'int64',
    },
    renewal: {
      type: 'Renewal',
      description: `Renewal describes the sharing duration and reauthorization required.`,
    },
    providerId: {
      type: 'number',
      description: `Provider Id for which the consent needs to be generated.`,
      isRequired: true,
      format: 'int64',
    },
    consentStatus: {
      type: 'Enum',
      isRequired: true,
    },
    providerAccountId: {
      type: 'number',
      description: `Unique identifier for the provider account resource. <br>This is created during account addition.<br><br><b>Endpoints</b>:<ul><li>GET providerAccounts</li></ul>`,
      isReadOnly: true,
      format: 'int64',
    },
    scope: {
      type: 'array',
      contains: {
        type: 'Scope',
      },
      isRequired: true,
    },
    title: {
      type: 'string',
      description: `Title for the consent form.`,
      isRequired: true,
    },
    applicationDisplayName: {
      type: 'string',
      description: `Application display name.`,
      isRequired: true,
    },
    startDate: {
      type: 'string',
      description: `Consent start date.`,
      isRequired: true,
    },
    expirationDate: {
      type: 'string',
      description: `Consent expiry date.`,
      isRequired: true,
    },
  },
} as const;
