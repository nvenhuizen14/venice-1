/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DerivedHoldingSummaryResponse = {
  properties: {
    holdingSummary: {
      type: 'array',
      contains: {
        type: 'DerivedHoldingsSummary',
      },
      isReadOnly: true,
    },
    link: {
      type: 'DerivedHoldingsLinks',
      isReadOnly: true,
    },
  },
} as const;
