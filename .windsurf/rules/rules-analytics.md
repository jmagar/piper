---
trigger: model_decision
description: 
globs: *
---
---
description: This rule explains how to create and update an analytics.md file to track how often .mdc rules is being used.
globs: *
alwaysApply: false
---

# Cursor Rules Analytics

Each time you use a Cursor rule, update the analytics tracking file.

File location:
```
PROJECT_ROOT/.cursor/analytics.md
```

## Format

The analytics file contains a count of how many times each rule has been used:

```
rule-name.mdc: 5
another-rule.mdc: 2
```

Add new rules as needed.
