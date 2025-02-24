/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MessageReaction = {
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
    emoji: {
      type: 'string',
      isRequired: true,
    },
    createdAt: {
      type: 'string',
      isRequired: true,
      format: 'date-time',
    },
  },
} as const;
