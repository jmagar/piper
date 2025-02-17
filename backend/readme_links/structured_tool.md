# StructuredTool Class Documentation

A class that represents a structured tool in the LangChain framework.

## Constructor

```typescript
new StructuredTool<T extends ZodObjectAny>(fields?)
```

## Properties

- **description** (Abstract): string
- **name** (Abstract): string
- **schema** (Abstract): T | ZodEffects
- **callbacks** (Optional)
- **metadata** (Optional): Record<string, unknown>
- **responseFormat** (Optional): string = "content"
- **returnDirect**: boolean = false
- **tags** (Optional): string[]
- **verbose**: boolean
- **verboseParsingErrors**: boolean = false

## Methods

### asTool
Converts the structured tool into a runnable tool-like object.

### assign
Assigns a mapping to create a new runnable.

### batch
Processes multiple inputs in batch.

[Source](https://api.js.langchain.com/classes/_langchain_core.tools.StructuredTool.html)