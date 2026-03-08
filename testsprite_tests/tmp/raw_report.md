
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** dailyfitness-app
- **Date:** 2026-02-27
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create workout template shell with Volume Calculator ON
- **Test Code:** [TC001_Create_workout_template_shell_with_Volume_Calculator_ON.py](./TC001_Create_workout_template_shell_with_Volume_Calculator_ON.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/a4a4573a-3bb1-4f63-bb29-0c488ddc39cc
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Start Create New template and fill required metadata
- **Test Code:** [TC002_Start_Create_New_template_and_fill_required_metadata.py](./TC002_Start_Create_New_template_and_fill_required_metadata.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/76fd0c07-c9fb-4da2-af48-3ee3e9cf1f83
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Save template with name, description, and Volume Calculator enabled
- **Test Code:** [TC003_Save_template_with_name_description_and_Volume_Calculator_enabled.py](./TC003_Save_template_with_name_description_and_Volume_Calculator_enabled.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/ae67fdc6-cc46-462c-868c-97a25922deb8
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Add Straight Set block with 2 sets and filled fields
- **Test Code:** [TC004_Add_Straight_Set_block_with_2_sets_and_filled_fields.py](./TC004_Add_Straight_Set_block_with_2_sets_and_filled_fields.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Create Template button not interactable on the Workout Templates page after two click attempts (element stale/not visible).
- Workout Templates page intermittently shows 'Please sign in to view workout templates.' indicating an authentication/session inconsistency that blocks access to the editor.
- No accessible 'Create New' / 'Create Template' control is reliably present in the current Training/Programs view to begin template creation.
- Cannot verify 'Straight Set' block because the template creation/editor UI is unreachable or non-interactable.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/477199c7-acfa-4026-95c6-2f3965644c7c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Add Superset block with 2 exercises and 2 sets
- **Test Code:** [TC005_Add_Superset_block_with_2_exercises_and_2_sets.py](./TC005_Add_Superset_block_with_2_exercises_and_2_sets.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/aa82186a-03a2-4265-aa39-98dc57ab8334
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Validation: cannot save template without a name
- **Test Code:** [TC010_Validation_cannot_save_template_without_a_name.py](./TC010_Validation_cannot_save_template_without_a_name.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/d2f9b114-c8f4-4dd3-8e1c-8e0e26a8a452
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Cancel edit after changing reps and verify value does not persist
- **Test Code:** [TC011_Cancel_edit_after_changing_reps_and_verify_value_does_not_persist.py](./TC011_Cancel_edit_after_changing_reps_and_verify_value_does_not_persist.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Reps input field not present on the template edit screen — template shows 'No exercises yet'.
- Edit Template action did not open an editor with editable exercise fields; no reps input was available after clicking Edit Template.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/db64037a-0131-4b5e-a411-8647662aa7ca
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Edit reps to 99, refresh by returning to templates list, then reopen and verify persistence
- **Test Code:** [TC014_Edit_reps_to_99_refresh_by_returning_to_templates_list_then_reopen_and_verify_persistence.py](./TC014_Edit_reps_to_99_refresh_by_returning_to_templates_list_then_reopen_and_verify_persistence.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/e8e87480-240b-4255-a57e-a295fef7d328
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Create a new 4-week program from coach dashboard entry point
- **Test Code:** [TC015_Create_a_new_4_week_program_from_coach_dashboard_entry_point.py](./TC015_Create_a_new_4_week_program_from_coach_dashboard_entry_point.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/4f5e8102-de9e-4cfb-a9bf-cd7e704d2e18
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Fill Basic Info for TS 4-Week Program with 4-week duration
- **Test Code:** [TC016_Fill_Basic_Info_for_TS_4_Week_Program_with_4_week_duration.py](./TC016_Fill_Basic_Info_for_TS_4_Week_Program_with_4_week_duration.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/647dfd81-947c-4736-a6c4-0abbc9dc92ef
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Schedule Week 1: assign templates to Monday, Wednesday, Friday and leave other days as Rest Day
- **Test Code:** [TC017_Schedule_Week_1_assign_templates_to_Monday_Wednesday_Friday_and_leave_other_days_as_Rest_Day.py](./TC017_Schedule_Week_1_assign_templates_to_Monday_Wednesday_Friday_and_leave_other_days_as_Rest_Day.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Training page could not be opened from the coach dashboard; clicking the bottom navigation did not navigate to a Training/programs view and instead activated Nutrition or produced an interactability error.
- 'Create New' (or '+' ) program button was not available on the visible Nutrition page, preventing starting the program creation flow.
- The 'Schedule' tab and 'Week 1' scheduling UI could not be reached because the program creation/management view was not accessible.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/f05243df-2624-4838-b50e-914197670691
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Schedule Week 2 (if supported): assign templates to Mon/Tue/Wed/Fri and leave other days Rest Day
- **Test Code:** [TC018_Schedule_Week_2_if_supported_assign_templates_to_MonTueWedFri_and_leave_other_days_Rest_Day.py](./TC018_Schedule_Week_2_if_supported_assign_templates_to_MonTueWedFri_and_leave_other_days_Rest_Day.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Template picker not present after multiple clicks on Day 1 and Day 2; no modal or template selection UI appeared.
- Assignment for Monday/Tuesday/Wednesday/Friday could not be completed because the template picker was not accessible.
- Day interactive elements were clickable but produced no visible change in the UI (no picker, no error, no toast), preventing progress.
- The schedule remains showing 'Rest Day' for all days of Week 2, confirming no templates were assigned.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/5ab7d106-d3a9-417c-97dd-9446610eb045
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 Save program and verify program detail shows TS 4-Week Program
- **Test Code:** [TC022_Save_program_and_verify_program_detail_shows_TS_4_Week_Program.py](./TC022_Save_program_and_verify_program_detail_shows_TS_4_Week_Program.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/134c4f63-d001-40a0-84be-34263fe64fc3
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 Edit an existing program schedule and verify the change persists after reopening
- **Test Code:** [TC023_Edit_an_existing_program_schedule_and_verify_the_change_persists_after_reopening.py](./TC023_Edit_an_existing_program_schedule_and_verify_the_change_persists_after_reopening.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- No schedule day with an assigned workout template found; all days display 'Rest Day', so a day to change to 'Rest Day' cannot be selected as required.
- The schedule shows the message 'No workouts scheduled this week', preventing the step 'Click on one day that shows a workout template' from being performed.
- The Edit Program -> Schedule edit flow cannot be validated because the necessary precondition (at least one day with an assigned workout template) is missing.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/2438eb24-c122-445d-834e-b0ffa93dd7dc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Schedule tab shows persisted assigned templates (not all Rest Day) for an existing program
- **Test Code:** [TC024_Schedule_tab_shows_persisted_assigned_templates_not_all_Rest_Day_for_an_existing_program.py](./TC024_Schedule_tab_shows_persisted_assigned_templates_not_all_Rest_Day_for_an_existing_program.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- No scheduled workout template found on the Schedule tab: all 7 days are labeled 'Rest Day'.
- Page displays the message 'No workouts scheduled this week', indicating there are no assigned workouts for the week.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d6d7f895-9eed-4a3c-b722-5274b0e3856f/dcd7d3fb-7904-4911-ba4a-136031796d11
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **60.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---