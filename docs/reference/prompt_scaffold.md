Agent Prompt Scaffold
Use this template for all engineering/feature/change requests to any AI dev agent. Follow the headings and provide clear, actionable instructions.
________________________________________
1. Context & Background
•	Explain the relevant business/product context.
Why is this task needed? What legacy behavior exists? Are there product goals or user pain points driving it? Reference relevant docs or tickets if needed.
2. Objective & Scope
•	Clearly state the desired outcome.
What needs to be changed, built, refactored, or removed? Is this a bugfix, feature, cleanup, or migration? What is the boundary of the work?
•	In Scope: List components, files, or behaviors that should be addressed.
•	Out of Scope / Do Not Change:
Explicitly mention any files, APIs, logic, or user experiences that must remain unchanged. Example: “Do not modify the database schema or any authentication logic as part of this task.”
•	
3. Requirements & Steps
•	Break down concrete steps the agent should follow.
List technical, functional, or UX requirements. Call out specific code paths, files, modules, or APIs to update. Mention database or schema changes, edge cases, and required validations.
4. Testing & Validation
•	Describe how to prove the change works.
Specify required unit, integration, or E2E tests. List test cases or scenarios to cover (including negative/legacy cases). Outline validation criteria and commands to run (e.g., npm test).
5. Code Quality & Documentation
•	Specify code conventions, formatting, and docs.
Enforce Prettier/linting. Require inline comments for key logic or refactors. Call out files to update (e.g., README.md, CHANGELOG.md).
6. Commit & Changelog Guidelines
•	Give instructions for atomic commits and history.
Define expected commit message format. Require changes to CHANGELOG.md or migration notes as needed. Reference any ADRs or architectural docs updated.
7. Acceptance Criteria
•	List the definition of done as checkboxes.
Summarize all deliverables and validations needed for acceptance. The agent should tick all boxes before marking the task complete.
8. Reference Docs
•	List related specs, docs, Figma, or legacy tickets.
Help the agent by pointing to relevant files, docs, or URLs for additional context.
________________________________________
Sample Scaffold (Copy/Paste)
markdown
CopyEdit
## Codex Agent Prompt Scaffold

### 1. Context & Background
_Explain what’s being changed and why (product, legacy, or user-driven)._

### 2. Objective & Scope
_State the exact goal, feature, or bugfix required._
In-scope: 
Out-of-scope:

### 3. Requirements & Steps
- Step 1: [describe]
- Step 2: [describe]
- (etc.)

### 4. Testing & Validation
- Unit/integration/E2E tests to add/update.
- Test cases (positive, negative, legacy).
- Validation steps/commands.

### 5. Code Quality & Documentation
- Formatting and linting rules.
- Required inline comments/doc updates.

### 6. Commit & Changelog Guidelines
- Commit message format.
- CHANGELOG/ADR/doc update instructions.

### 7. Acceptance Criteria
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### 8. Reference Docs
- [filename.md](link)
- [Design doc](link)

