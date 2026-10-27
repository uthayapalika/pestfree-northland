# Pest-Free Tracker ERD

This entity-relationship diagram reflects the SQLAlchemy tables and foreign
keys defined in `app/db/models.py`.

```mermaid
erDiagram
    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        boolean can_view_exact_location
        string notification_topic "private, nullable"
    }

    TRAP_LINES {
        int id PK
        string name
        string general_area
        int created_by FK
        datetime created_at
    }

    TRAPS {
        int id PK
        int trap_line_id FK
        string code
        string trap_type
        string general_area
        float exact_lat "nullable"
        float exact_lng "nullable"
        boolean is_sensitive
        string status
    }

    TRAP_CHECKS {
        int id PK
        int trap_id FK
        int user_id FK
        datetime checked_at
        string status
        string notes
    }

    TRAP_MAINTENANCE {
        int id PK
        int trap_id FK
        int user_id FK
        datetime performed_at
        string notes
    }

    CATCHES {
        int id PK
        int check_id FK
        int trap_id FK
        string species
        datetime recorded_at
    }

    TRAP_LINE_ASSIGNMENTS {
        int id PK
        int trap_line_id FK
        int user_id FK
        int assigned_by FK
        datetime assigned_at
    }

    FIELD_TASKS {
        int id PK
        int trap_id FK "nullable"
        int trap_line_id FK "nullable"
        int assigned_to FK
        int assigned_by FK
        string title
        string notes
        datetime due_at "nullable"
        string status
        datetime created_at
        datetime completed_at "nullable"
    }

    AUDIT_LOGS {
        int id PK
        int actor_id "nullable"
        string actor_name
        string action
        string entity_type
        int entity_id
        datetime changed_at
        json before "nullable"
        json after "nullable"
    }

    USERS ||--o{ TRAP_LINES : creates
    TRAP_LINES ||--o{ TRAPS : contains
    TRAPS ||--o{ TRAP_CHECKS : receives
    USERS ||--o{ TRAP_CHECKS : records
    TRAPS ||--o{ TRAP_MAINTENANCE : has
    USERS ||--o{ TRAP_MAINTENANCE : performs
    TRAP_CHECKS ||--o{ CATCHES : records
    TRAPS ||--o{ CATCHES : caught_at
    TRAP_LINES ||--o{ TRAP_LINE_ASSIGNMENTS : assigned_to
    USERS ||--o{ TRAP_LINE_ASSIGNMENTS : receives
    USERS ||--o{ TRAP_LINE_ASSIGNMENTS : assigns
    TRAP_LINES o|--o{ FIELD_TASKS : scopes
    TRAPS o|--o{ FIELD_TASKS : targets
    USERS ||--o{ FIELD_TASKS : assigned_to
    USERS ||--o{ FIELD_TASKS : assigns
    USERS o|--o{ AUDIT_LOGS : acts_in
```

## Relationship notes

- One user can create multiple trap lines. Each trap line records its creator.
- One trap line can contain multiple traps. Each trap belongs to one line.
- A trap can have multiple checks and maintenance records; each record is
  associated with the user who recorded or performed it.
- A catch references both the check when it was recorded and the trap where it
  was caught.
- Trap coordinates are optional. Exact locations can be sensitive, with access
  controlled separately from the other trap details.
- A field task can target either a trap line or an individual trap, and records
  its assignee, creator, due date, and completion state.
- Trap-line assignments connect volunteers or field workers to lines. The
  `assigned_by` value records the coordinator who made the assignment.
- Audit entries retain actor names and before/after snapshots. Entity IDs are
  polymorphic rather than foreign keys, so deleted records remain auditable.
- A user's personal notification topic is nullable and private; API responses
  expose only whether one is configured.
- `email` is unique. `PK` marks a primary key; `FK` marks a foreign key; `UK`
  marks a unique field.
