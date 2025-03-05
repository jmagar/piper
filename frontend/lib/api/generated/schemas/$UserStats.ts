/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UserStats = {
  properties: {
    userId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    messageCount: {
      type: 'number',
      isRequired: true,
    },
    conversationCount: {
      type: 'number',
      isRequired: true,
    },
    lastActive: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
