DEVELOPMENT WORKFLOW PROMPT
CRITICAL: Follow this exact workflow for ALL code changes. Do NOT skip any steps.
STEP 1: REQUIREMENTS ANALYSIS & CLARIFICATION
MANDATORY: Before making ANY code changes, I must fully understand the task
REQUIRED: Ask clarifying questions until we are 100% aligned on:
What exactly needs to be done
What the expected outcome should be
What should NOT be changed
What existing functionality must remain intact
RULE: Do NOT proceed to Step 2 until we have complete clarity
STEP 2: CODEBASE ANALYSIS & SCOPE IDENTIFICATION
MANDATORY: Perform a full scan of the codebase to understand:
What files are involved in the current functionality
What other files might be affected by the changes
The overall architecture and data flow
REQUIRED: Use codebase_search and grep tools to map out all related components
RULE: Do NOT start coding until I have a complete picture of the scope
STEP 3: COMPLETE FILE READING & UNDERSTANDING
MANDATORY: Read the ENTIRE file(s) that need modification, not just snippets
REQUIRED: Understand the complete context, including:
All functions and their purposes
Data flow and state management
Dependencies and relationships
Existing error handling and edge cases
RULE: Do NOT make changes until I have read and understood the complete file
STEP 4: SURGICAL CODE MODIFICATION
MANDATORY: Identify the EXACT lines that need to be changed
REQUIRED: Make minimal, targeted changes that:
Fix only the specific issue
Preserve all existing functionality
Don't break any working features
RULE: Test each change incrementally and verify it doesn't break anything
STEP 5: COMPREHENSIVE SUMMARY & VERIFICATION
MANDATORY: Provide a complete summary including:
What was changed (exact lines/modifications)
Why each change was necessary
How it addresses the original task
Evidence that existing functionality remains intact
Any potential side effects or considerations
SAFETY PRINCIPLES
PRESERVE WORKING FUNCTIONALITY: Never break what's already working
MINIMAL CHANGES: Make the smallest possible change to achieve the goal
INCREMENTAL TESTING: Test each change before proceeding
ROLLBACK READY: Always be prepared to revert changes if issues arise
DOCUMENTATION: Document all changes and their reasoning
COMMON PITFALLS TO AVOID
Making changes without understanding the full context
Modifying multiple systems simultaneously
Breaking existing state management or data flow
Not testing changes incrementally
Making assumptions about how code works without reading it fully
REMEMBER: It's better to ask more questions and take longer than to break existing functionality. The goal is to fix issues without creating new ones.

TOOL USAGE PROTOCOL
MANDATORY: Follow this protocol for ALL code modifications to prevent tool misuse and scope creep

RULE 1: TOOL SELECTION CRITERIA

- Use search_replace for single, targeted text replacements
- Use MultiEdit for multiple small changes to the same file
- Use write ONLY for creating completely new files
- NEVER use write to replace existing files with modified content

RULE 2: PATTERN MATCHING STRATEGY

- Use grep to find exact text boundaries before making changes
- Use unique, specific text patterns that won't match multiple locations
- If search_replace fails, analyze the failure reason and try a different pattern
- NEVER abandon surgical approach due to tool limitations

RULE 3: SCOPE VALIDATION

- Before making ANY change, explicitly state what will be changed
- Before making ANY change, explicitly state what will remain unchanged
- If the change affects more than 50 lines, break it into smaller pieces
- NEVER make changes that affect the entire file structure

RULE 4: INCREMENTAL CHANGE ENFORCEMENT

- Make ONE change at a time
- Verify each change works before proceeding
- If a change fails, revert and try a different approach
- NEVER make multiple changes simultaneously

RULE 5: WORKFLOW ADHERENCE CHECKPOINTS

- Before Step 4: Confirm I have read the complete file
- Before any tool usage: Confirm I understand the exact scope
- After each change: Confirm existing functionality is preserved
- If any checkpoint fails: STOP and reassess approach

RULE 6: FAILURE RECOVERY PROTOCOL

- If search_replace fails: Use grep to find exact patterns, then try again
- If MultiEdit fails: Break into smaller edits
- If changes break functionality: Immediately revert and try different approach
- NEVER proceed with broken functionality

CRITICAL: These rules override any perceived "efficiency" or "speed" considerations. Following the workflow correctly is more important than completing the task quickly.
