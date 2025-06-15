// Piper MCP Server Configuration Schema
// Piper MCP Server Configuration Schema
export const mcpConfigJsonSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Piper MCP Server Configuration",
  "description": "Configuration file for defining MCP servers managed by Piper.",
  "type": "object",
  "properties": {
    "mcpServers": {
      "description": "A collection of MCP server configurations. The key is the server name.",
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/McpServerDefinition"
      }
    }
  },
  "required": [
    "mcpServers"
  ],
  "definitions": {
    "HttpTransportSettings": { 
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "format": "uri"
        },
        "headers": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "required": ["url"]
    },
    "McpServerDefinition": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },

        "enabled": {
          "type": "boolean",
          "default": true
        },
        "schemas": {
            "type": "object",
            "additionalProperties": { "type": "object" }
        },
        "command": {
          "type": "string"
        },
        "args": {
          "type": "array",
          "items": { "type": "string" }
        },
        "env": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        },
        "cwd": {
          "type": "string"
        },
        "url": {
          "type": "string",
          "format": "uri"
        },
        "headers": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        },
        "transport": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": ["stdio", "sse", "streamable-http"]
            },
            "command": { "type": "string" },
            "args": { "type": "array", "items": { "type": "string" } },
            "env": { "type": "object", "additionalProperties": { "type": "string" } },
            "cwd": { "type": "string" },
            "httpSettings": { "$ref": "#/definitions/HttpTransportSettings" }
          },
          "oneOf": [
            { 
              "properties": { "type": { "const": "stdio" } },
              "required": ["type", "command"]
            },
            { 
              "properties": { "type": { "enum": ["sse", "streamable-http"] } },
              "required": ["type", "httpSettings"]
            }
          ]
        }
      },
      "oneOf": [
        { 
          "required": ["command"],
          "not": { "anyOf": [ {"required": ["url"]}, {"required": ["transport"]} ] } 
        },
        { 
          "required": ["url"],
          "not": { "anyOf": [ {"required": ["command"]}, {"required": ["transport"]} ] } 
        },
        { 
          "required": ["transport"],
          "not": { "anyOf": [ {"required": ["command"]}, {"required": ["url"]} ] } 
        }
      ],
      "required": ["enabled"]
    }
  }
} as const; // Using 'as const' for better type inference if needed
