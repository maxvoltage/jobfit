# Switching to PostgreSQL

Because JobFit uses SQLAlchemy with a declarative base, switching from SQLite to PostgreSQL is straightforward.

## 1. Install Dependencies
You will need a PostgreSQL driver like `psycopg2` or `psycopg`. Using `uv` (recommended):
```bash
uv add "psycopg[binary]"
```

## 2. Update Environment Variables
You don't need to change any code. Simply update the `DATABASE_URL` in your `.env` file or environment:

```env
# From SQLite:
# DATABASE_URL=sqlite:///./jobfit.db

# To PostgreSQL:
DATABASE_URL=postgresql://user:password@localhost:5432/jobfit
```

## 3. Production Considerations
In `backend/database.py`, the current engine initialization includes a SQLite-specific argument:

```python
# current:
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
```

For a cleaner multi-DB support, you can modify it to only apply that argument if using SQLite:

```python
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
```

## 4. Database Migrations
For production use, we recommend using **Alembic** to manage schema changes, especially when moving to a shared database like Postgres.
