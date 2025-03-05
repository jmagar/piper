/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $LangChainOptions = {
  properties: {
    streaming: {
      type: 'boolean',
    },
    memory: {
      type: 'boolean',
    },
    memorySize: {
      type: 'number',
      maximum: 100,
      minimum: 1,
    },
    fallbackProvider: {
      type: 'Enum',
    },
  },
} as const;
