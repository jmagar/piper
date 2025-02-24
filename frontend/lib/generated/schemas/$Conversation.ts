/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Conversation = {
  properties: {
    id: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    title: {
      type: 'string',
      isRequired: true,
    },
    createdAt: {
      type: 'string',
      isRequired: true,
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      isRequired: true,
      format: 'date-time',
    },
    metadata: {
      type: 'dictionary',
      contains: {
        properties: {
        },
      },
    },
  },
} as const;
