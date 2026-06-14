from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from database import init_db, get_connection
from datetime import date as date_type

app = FastAPI(title="Money Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# --- Models ---

class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    account_id: int


# --- Accounts ---

@app.get("/accounts")
def get_accounts():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM accounts ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# --- Balances ---

@app.get("/balances")
def get_balances():
    conn = get_connection()

    total = conn.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions").fetchone()["total"]

    rows = conn.execute("""
        SELECT a.id, a.name, COALESCE(SUM(t.amount), 0) as balance
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        GROUP BY a.id, a.name
        ORDER BY a.id
    """).fetchall()

    conn.close()
    return {
        "total": total,
        "accounts": [dict(r) for r in rows]
    }


# --- Transactions ---

@app.get("/transactions")
def get_transactions(limit: int = 20):
    conn = get_connection()
    rows = conn.execute("""
        SELECT t.id, t.date, t.description, t.amount, t.created_at,
               a.id as account_id, a.name as account_name
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/transactions", status_code=201)
def create_transaction(tx: TransactionCreate):
    conn = get_connection()

    # Validate account exists
    account = conn.execute("SELECT id FROM accounts WHERE id = ?", (tx.account_id,)).fetchone()
    if not account:
        conn.close()
        raise HTTPException(status_code=400, detail="Account not found")

    cursor = conn.execute("""
        INSERT INTO transactions (date, description, amount, account_id)
        VALUES (?, ?, ?, ?)
    """, (tx.date, tx.description, tx.amount, tx.account_id))

    tx_id = cursor.lastrowid
    conn.commit()

    row = conn.execute("""
        SELECT t.id, t.date, t.description, t.amount, t.created_at,
               a.id as account_id, a.name as account_name
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.id = ?
    """, (tx_id,)).fetchone()
    conn.close()

    return dict(row)


@app.delete("/transactions/{tx_id}", status_code=204)
def delete_transaction(tx_id: int):
    conn = get_connection()
    result = conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
