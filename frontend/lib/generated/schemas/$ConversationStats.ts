/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ConversationStats = {
  properties: {
    conversationId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    messageCount: {
      type: 'number',
      isRequired: true,
    },
    participantCount: {
      type: 'number',
      isRequired: true,
    },
    lastMessage: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
