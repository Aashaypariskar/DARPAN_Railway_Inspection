---
description: How to perform a safety and dependency audit before and after the task to prevent regressions.
---
## Objective
Ensure that no existing functionality is broken by new changes. Proactively identify side effects and dependencies.

## Pre-Implementation Audit
1. **Identify Target Files**: List all files to be modified.
2. **Scan for References**: For every modified function, class, or variable, search the entire project for all its usages.
   - Use `grep_search` or `run_command` with `findstr`.
3. **Map Side Effects**:
   - If a model is changed (e.g., new column), identify all controllers, services, and reporting scripts that query that model.
   - If a utility is changed, identify all components importing it.
4. **Identify Protected Logic**: List logic that the user explicitly stated must NOT change (e.g., autosave, reporting).

## Implementation Rules
1. **Atomic Changes**: Keep changes focused on the goal.
2. **Structural Checks**: If changing a shared configuration (like `db.js`), verify impact on CLI tools (Sequelize CLI) and background scripts.
3. **Comment & Tag**: Mark new logic clearly to distinguish it from legacy untouched code.

## Post-Implementation Verification (SMOKE TEST)
1. **Regressive Search**: Check for any "Unknown column" or "ReferenceError" in the entire project logs.
2. **Feature Validation**: Explicitly test at least one feature that was NOT supposed to change but shared a dependency with the modified code.
3. **Build Integrity**: Ensure both `frontend` and `monitoring-dashboard` can build successfully.
4. **Port & Conflict Check**: Ensure no zombie processes are left behind on ports like 8080/8081.

## Reporting
Before providing the final result, provide a "Safety Audit Report" detailing:
- What was checked.
- References found.
- Potential risks mitigated.
- Confirmation that no untouched systems were affected.
