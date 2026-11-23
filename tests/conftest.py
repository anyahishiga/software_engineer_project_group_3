import os
import sys
import types
from unittest.mock import MagicMock

import pytest

# RUN_DB_TESTS=1  -> dùng MySQL THẬT (test SQL, xem tests/test_sql_integration.py)
# mặc định         -> giả MySQL, test chạy nhanh, không cần database
USE_REAL_DB = os.getenv("RUN_DB_TESTS") == "1"

if not USE_REAL_DB and "mysql" not in sys.modules:
    mysql = types.ModuleType("mysql")
    connector = types.ModuleType("mysql.connector")
    connector.pooling = MagicMock()
    mysql.connector = connector
    sys.modules.update({"mysql": mysql, "mysql.connector": connector,
                        "mysql.connector.pooling": connector.pooling})

try:
    import bcrypt  # noqa: F401
except ModuleNotFoundError:
    sys.modules["bcrypt"] = MagicMock()


@pytest.fixture
def client():
    from backend.app import app
    app.config["TESTING"] = True
    return app.test_client()
