import logging

logger = logging.getLogger(__name__)


def run_migrations():
    """
    Placeholder for future database migrations.

    Since we are in early development and don't have production users,
    we prefer to let SQLAlchemy's create_all() handle the initial
    schema creation.

    If you make schema changes, you can add logic here to update existing
    SQLite files, or simply delete your local jobfit.db to start fresh.
    """
    # For now, we are letting the app start fresh.
    # Future migration logic (e.g. adding new columns to existing DBs) goes here.
    pass


if __name__ == "__main__":
    run_migrations()
