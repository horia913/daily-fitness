# Phase N4: Multi-Plan Assignment + Daily Selection — Verification Checklist

Run through these after applying the migration and deploying.

## 1. Coach: Assign two plans to one client
- From Meal Plans page, assign Plan A (e.g. 2000 kcal) to a test client with label "Training Day".
- Assign Plan B (e.g. 1800 kcal) to the same client with label "Rest Day".
- Confirm both assignments appear (no deactivation of the first).

## 2. Client: Plan picker appears
- As the test client, open the Fuel tab.
- Confirm the "Today's Plan" picker shows both plans with names, calories, and labels.

## 3. Client: Select "Training Day"
- Select the Training Day plan.
- Confirm meals load for that plan.

## 4. Client: Complete 2 meals on Training Day
- Mark 2 meals complete on the Training Day plan.
- Confirm progress ring shows 2/N.

## 5. Client: Switch to "Rest Day"
- Switch to Rest Day in the picker.
- Confirm meals change to the rest day plan.
- Confirm progress ring resets to 0 for this plan (no completions yet).
- Confirm Training Day completions are not lost (switch back to verify).

## 6. Client: Switch back to Training Day
- Switch back to Training Day.
- Confirm the 2 completions are still there.

## 7. Client: Next day
- (Next calendar day or after clearing selection) Open Fuel tab.
- Confirm either no plan pre-selected or first plan default; client can choose and it saves.

## 8. Coach: Client nutrition view
- Open the client's nutrition view.
- Confirm both active assignments are visible with labels.
- Confirm "Today's selection" shows the plan the client chose today.
- Confirm "Plan chosen per day" (7-day history) shows correct selections.

## 9. Coach: Deactivate "Rest Day"
- Deactivate the Rest Day assignment (Deactivate button).
- As client, confirm only one plan appears (picker disappears; single plan name in header).

## 10. Coach: Edit label
- Edit the label on the remaining plan (Edit Label → save).
- As client, confirm the updated label appears when applicable.
