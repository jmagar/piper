/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Tool = {
  properties: {
    id: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    name: {
      type: 'string',
      isRequired: true,
    },
    description: {
      type: 'string',
    },
    serverId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    type: {
      type: 'Enum',
    },
    parameters: {
      type: 'array',
      contains: {
        properties: {
          name: {
            type: 'string',
            isRequired: true,
          },
          type: {
            type: 'string',
            isRequired: true,
          },
          description: {
            type: 'string',
          },
          required: {
            type: 'boolean',
          },
          schema: {
            type: 'dictionary',
            contains: {
              properties: {
              },
            },
          },
        },
      },
    },
    metadata: {
      type: 'dictionary',
      contains: {
        properties: {
        },
      },
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
