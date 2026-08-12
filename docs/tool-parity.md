# MCP Tool Parity Mapping

Mapping between SPEC.md tool inventory and implemented MCP tools.

## Legend

- ✅ = Implemented and matches SPEC
- ⚠️ = Implemented with different name
- ➕ = Extra tool not in SPEC (added for completeness)
- ❌ = Missing from implementation

## Activities

| SPEC Tool           | Implemented Tool    | Status                      |
| ------------------- | ------------------- | --------------------------- |
| `activities_list`   | `activities_list`   | ✅                          |
| `activities_create` | `activities_create` | ✅                          |
| `activities_delete` | `activities_delete` | ✅                          |
| `activities_stats`  | `dashboard_stats`   | ⚠️ (renamed, covers stats)  |
| —                   | `activities_get`    | ➕ (added for completeness) |
| —                   | `activities_update` | ➕ (added for completeness) |

## Projects

| SPEC Tool               | Implemented Tool               | Status                      |
| ----------------------- | ------------------------------ | --------------------------- |
| `projects_list`         | `projects_list`                | ✅                          |
| `projects_get`          | `projects_get`                 | ✅                          |
| `projects_create`       | `projects_create`              | ✅                          |
| `projects_update`       | `projects_update`              | ✅                          |
| `projects_set_archived` | `projects_set_archived`        | ✅                          |
| —                       | `projects_delete`              | ➕ (added for completeness) |
| —                       | `projects_get_with_activities` | ➕ (added for completeness) |

## Goals

| SPEC Tool      | Implemented Tool | Status                      |
| -------------- | ---------------- | --------------------------- |
| `goals_list`   | `goals_list`     | ✅                          |
| `goals_create` | `goals_create`   | ✅                          |
| `goals_update` | `goals_update`   | ✅                          |
| `goals_delete` | `goals_delete`   | ✅                          |
| —              | `goals_get`      | ➕ (added for completeness) |

## Reports

| SPEC Tool                      | Implemented Tool       | Status                                                                   |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------ |
| `reports_list`                 | `reports_list`         | ✅                                                                       |
| `reports_get`                  | `reports_get`          | ✅                                                                       |
| `reports_check_activity_count` | —                      | ❌ (intentionally not exposed; generation validates the activity count)  |
| `reports_generate`             | `reports_generate`     | ✅                                                                       |
| `reports_create`               | —                      | ❌ (use `reports_generate` or the app’s deterministic draft flow)        |
| `reports_update`               | —                      | ❌ (editing is available in the app; MCP exposes `reports_improve_text`) |
| `reports_delete`               | `reports_delete`       | ✅                                                                       |
| `reports_improve_text`         | `reports_improve_text` | ✅                                                                       |

## Search & Insights

| SPEC Tool         | Implemented Tool  | Status |
| ----------------- | ----------------- | ------ |
| `search_global`   | `search_global`   | ✅     |
| `dashboard_stats` | `dashboard_stats` | ✅     |
| `insights_get`    | `insights_get`    | ✅     |

## Contacts

| SPEC Tool         | Implemented Tool  | Status |
| ----------------- | ----------------- | ------ |
| `contacts_list`   | `contacts_list`   | ✅     |
| `contacts_get`    | `contacts_get`    | ✅     |
| `contacts_create` | `contacts_create` | ✅     |
| `contacts_update` | `contacts_update` | ✅     |
| `contacts_delete` | `contacts_delete` | ✅     |

## Interactions

| SPEC Tool             | Implemented Tool      | Status |
| --------------------- | --------------------- | ------ |
| `interactions_list`   | `interactions_list`   | ✅     |
| `interactions_create` | `interactions_create` | ✅     |
| `interactions_update` | `interactions_update` | ✅     |
| `interactions_delete` | `interactions_delete` | ✅     |
| `network_stats`       | `network_stats`       | ✅     |

## Outreach

| SPEC Tool               | Implemented Tool        | Status |
| ----------------------- | ----------------------- | ------ |
| `outreach_list`         | `outreach_list`         | ✅     |
| `outreach_generate`     | `outreach_generate`     | ✅     |
| `outreach_create`       | `outreach_create`       | ✅     |
| `outreach_update`       | `outreach_update`       | ✅     |
| `outreach_delete`       | `outreach_delete`       | ✅     |
| `outreach_improve_text` | `outreach_improve_text` | ✅     |

## Focus & Writing

| SPEC Tool                 | Implemented Tool          | Status |
| ------------------------- | ------------------------- | ------ |
| `focus_get`               | `focus_get`               | ✅     |
| `focus_save`              | `focus_save`              | ✅     |
| `focus_reset`             | `focus_reset`             | ✅     |
| `focus_log_decompression` | `focus_log_decompression` | ✅     |
| `dictation_polish`        | `dictation_polish`        | ✅     |

## Settings

| SPEC Tool         | Implemented Tool  | Status |
| ----------------- | ----------------- | ------ |
| `settings_get`    | `settings_get`    | ✅     |
| `settings_update` | `settings_update` | ✅     |

## Vault

| SPEC Tool                     | Implemented Tool              | Status |
| ----------------------------- | ----------------------------- | ------ |
| `vault_status`                | `vault_status`                | ✅     |
| `vault_list_projects`         | `vault_list_projects`         | ✅     |
| `vault_begin_setup`           | `vault_begin_setup`           | ✅     |
| `vault_begin_change_password` | `vault_begin_change_password` | ✅     |
| `vault_begin_unlock`          | `vault_begin_unlock`          | ✅     |
| `vault_lock`                  | `vault_lock`                  | ✅     |
| `vault_set_project_locked`    | `vault_set_project_locked`    | ✅     |

## Account Data

| SPEC Tool                  | Implemented Tool           | Status |
| -------------------------- | -------------------------- | ------ |
| `account_clear_activities` | `account_clear_activities` | ✅     |

## Summary

- **SPEC tools**: 55
- **SPEC inventory**: 55 entries
- **Current registered tools**: 57
- **Contract note**: the two report authoring entries above are intentionally represented by the deterministic generation and improve-text tools; `reports_check_activity_count` is folded into generation validation.
- **Additional tools**: CRUD and retrieval helpers are marked ➕ in the tables above.

## Notes

1. `reports_check_activity_count` was removed because activity count is automatically checked during `reports_generate` (max 500 activities).
2. `activities_stats` was renamed to `dashboard_stats` to match the broader dashboard analytics scope.
3. Report generation and text improvement remain separate so assistants can create a grounded brief without pretending to be a general-purpose editor.
4. Extra tools (get, delete, update variants) were added to provide complete CRUD coverage for all entities.
