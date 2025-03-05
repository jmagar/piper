/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $StreamChunk = {
  properties: {
    type: {
      type: 'Enum',
      isRequired: true,
    },
    content: {
      type: 'string',
      isRequired: true,
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
