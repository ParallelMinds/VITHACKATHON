import sqlite3

DB_NAME = "clearsight.db"

# ---------------- INIT ----------------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT,
        origin TEXT,
        destination TEXT,
        container_no TEXT
    )
    """)

    conn.commit()
    conn.close()

# ---------------- INSERT ----------------
def insert_container(case_id, origin, destination, container_no):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO containers (case_id, origin, destination, container_no)
    VALUES (?, ?, ?, ?)
    """, (case_id, origin, destination, container_no))

    conn.commit()
    conn.close()

# ---------------- GET LATEST ----------------
def get_latest_container():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM containers
    ORDER BY id DESC
    LIMIT 1
    """)

    result = cursor.fetchone()

    conn.close()
    return result

# ---------------- GET ALL ----------------
def get_all_containers():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM containers
    ORDER BY id DESC
    """)

    results = cursor.fetchall()

    conn.close()
    return results