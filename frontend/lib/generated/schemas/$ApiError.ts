/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ApiError = {
  properties: {
    message: {
      type: 'string',
      isRequired: true,
    },
    code: {
      type: 'string',
    },
    details: {
      type: 'dictionary',
      contains: {
        properties: {
        },
      },
    },
  },
} as const;
