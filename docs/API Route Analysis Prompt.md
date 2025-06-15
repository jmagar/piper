## API Route Analysis Prompt

**Objective**:
Conduct a comprehensive analysis of the API route located at `[Specify Target Directory Path Here]`. The goal is to understand its architecture, functionality, identify potential issues, and suggest improvements. The output should be a structured markdown document detailing these findings, aiming for a style and thoroughness similar to previous API analyses conducted for this project.

**Scope**:
Analyze all relevant TypeScript/JavaScript files within the specified target directory, including any subdirectories (e.g., `lib/`, `utils/`, `helpers/`) that are integral to this specific API route's logic.

**Analysis Dimensions - For Each File & Overall Module**:

1.  **Core Functionality & Purpose**:
    *   What is the primary responsibility of this file/module?
    *   What specific features or API endpoints (e.g., GET, POST, PUT, DELETE on specific sub-paths) does it implement or support?
    *   What are the main functions, classes, or exported members, and what are their roles?

2.  **Key Data Structures & Types**:
    *   Identify important data structures, interfaces, Zod schemas (or other validation schemas), and TypeScript types used or defined.
    *   How is incoming data validated and outgoing data structured/transformed?

3.  **Inter-Module Dependencies & Interactions**:
    *   How does this file/module interact with other modules within the same API route or project?
    *   What are its dependencies on external libraries, services (e.g., database, external APIs), or shared utilities (e.g., MCP tools, Prisma client)?
    *   Trace key control flows (e.g., request handling pipeline) and data flows (e.g., how data is passed between functions or modules).

4.  **Configuration & Environment**:
    *   Identify any reliance on environment variables or configuration files.
    *   How is configuration accessed and utilized within this route?

5.  **Error Handling & Logging**:
    *   How are errors handled (e.g., try-catch blocks, specific error types, standardized error responses)?
    *   What logging practices are in place (e.g., use of `appLogger`, `aiSdkLogger`, or other logging mechanisms)? Are logs structured and informative? Is logging consistent?

6.  **Potential Issues (MECE Approach - Mutually Exclusive, Collectively Exhaustive)**:
    *   **Performance**: Identify potential bottlenecks, inefficient algorithms, synchronous operations that could be asynchronous, N+1 database query patterns, or slow external calls.
    *   **Security**: Assess input validation (for all request parts: body, query params, headers, path params), output encoding, authentication/authorization mechanisms, handling of sensitive data, and any potential for common web vulnerabilities (e.g., XSS, CSRF, Injection if applicable).
    *   **Maintainability & Readability**: Look for overly complex logic, lack of comments where needed, inconsistent coding styles, "magic" numbers/strings, tight coupling between components, code duplication, or dead/unreachable code.
    *   **Robustness & Reliability**: Evaluate the handling of edge cases, resilience to unexpected inputs or failures in dependencies, and potential resource leaks.
    *   **Scalability**: Consider design choices that might impact the ability of the route to handle increasing load.
    *   **Type Safety**: Note any use of `any`, overly broad types, or type assertions (`as any`, `as unknown as X`) that might compromise type safety.
    *   **Testability**: Assess if the code structure is conducive to unit and integration testing.

7.  **Potential Improvements & Refactoring**:
    *   Provide actionable suggestions for addressing any identified issues.
    *   Identify opportunities for code simplification, performance optimization, or improved clarity and organization.
    *   Recommend adherence to established best practices or project-specific patterns if deviations are noted.

**Output Format**:
Produce a markdown document named `[APIRouteName]_analysis_notes.md` (e.g., `users_api_analysis_notes.md`).
Structure the notes as follows:

```markdown
# [API Route Name] API Analysis Notes (`[Full Directory Path]`)

## `[filename1.ts]` Observations:

1.  **[Observation Title/Category - e.g., Core Logic: User Creation, Potential Security Issue: Input Validation]**:
    *   **File**: `[filename1.ts]`
    *   **(Optional) Function/Class/Endpoint**: `[relevant_function_or_class_name / POST /users]`
    *   **Observation**: [Detailed description of what you observed in the code.]
    *   **Potential Impact**: [What could be the positive or negative consequence of this observation?]
    *   **Suggestion**: [Actionable recommendation, area for further investigation, or acknowledgment of good practice.]

2.  **[Another Observation for filename1.ts]**:
    *   ...

## `lib/[filename2.ts]` Observations: (If applicable)

1.  **[Observation for filename2.ts]**:
    *   ...

---

## Comprehensive Summary of [API Route Name] API

(After individual file analysis, provide a synthesized overview of the entire API route module. This summary should cover:
    *   Overall architecture and request lifecycle for this route.
    *   Key functional areas and how they interact.
    *   A consolidated list or categorization of the most significant potential issues and areas for improvement.
    *   An overall assessment of the module's design, strengths, and weaknesses.)