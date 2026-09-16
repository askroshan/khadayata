/*
# Add elder_priority flag to oral_histories

1. Modified Tables
- `oral_histories`: adds `elder_priority` (boolean, default false, not indexed).

2. Purpose
- Oral history uploads from members aged 70+ are meant to be highlighted first
  on the public and member Oral History pages. An earlier migration attempted
  to add this flag to a table named `oral_history`, which does not exist
  (the real table is `oral_histories`), so the flag never landed. The app
  already reads and writes this column.

3. Security
- No RLS changes; existing policies continue to apply to the new column.
- The column is not a privileged/verification column, so no guard trigger
  change is needed.
*/

ALTER TABLE oral_histories ADD COLUMN IF NOT EXISTS elder_priority boolean DEFAULT false;
