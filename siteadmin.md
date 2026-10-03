# Site Admin Access

## Current State (as of 2026-10-03)

### Active Admin Users

| Name | Email | Role | Scope |
|---|---|---|---|
| Roshan Shah | roshan@khadayataonline.com | Global Admin | Platform-wide |
| Rushik Shah | rushik@alakmalak.com | Chapter Admin | Ahmedabad |
| Rushik Shah | rushik@alakmalak.com | Committee Chair | Ahmedabad |

### Global Admin Login

- **Email:** roshan@khadayataonline.com
- **Password:** Managed securely — not stored in this file.
- The account was created via migration `create_global_admin_roshan_20261003`.
- Verification level is 0 (unverified). The Global Admin role assignment
  grants full admin access regardless of verification level. Verification
  can be completed through the admin panel.

## Recovering Global Admin Access

To grant Global Admin to an existing member, run this SQL via the Supabase
MCP `apply_migration` tool (replace the email with the real member's email):

```sql
INSERT INTO role_assignments (member_id, role_id, start_date)
SELECT m.id, 'a0100001-0001-0001-0001-000000000001', CURRENT_DATE
FROM members m
JOIN auth.users au ON au.id = m.user_id
WHERE au.email = 'REPLACE_WITH_REAL_EMAIL';
```

The role UUID `a0100001-0001-0001-0001-000000000001` is the fixed Global
Admin role seeded in migration `seed_roles_and_assignments`.

## Security Notes

- **Never store passwords in this file or any repository file.**
- Admin credentials should only be managed through the Supabase dashboard
  or the application's own admin panel.
- Test accounts belong in local development environments only
  (see `local-install/`). Never seed them into production.
- See AGENTS.md section 3.1 for the full no-fake-data-in-production rule.
