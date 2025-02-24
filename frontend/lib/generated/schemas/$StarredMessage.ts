/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $StarredMessage = {
  properties: {
    id: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    messageId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    userId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    note: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
      isRequired: true,
      format: 'date-time',
    },
  },
} as const;
