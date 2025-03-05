/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ChatMessage = {
  properties: {
    id: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    content: {
      type: 'string',
      isRequired: true,
    },
    role: {
      type: 'Enum',
      isRequired: true,
    },
    type: {
      type: 'ChatMessageType',
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
      type: 'ChatMessageMetadata',
    },
    status: {
      type: 'Enum',
    },
  },
} as const;
