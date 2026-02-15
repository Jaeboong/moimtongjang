import { useState } from "react";
import { money, sourceLabel, toKRDate } from "../../utils/format";

export default function TransactionsCard({
  transactions,
  isAdmin,
  onApprovePending,
  onUpdateEntry,
  onDeleteEntry,
}) {
  const [editingTxId, setEditingTxId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editMonthKey, setEditMonthKey] = useState("");
  const [editStatus, setEditStatus] = useState("");

  function startEditTransaction(tx) {
    setEditingTxId(tx.id);
    setEditAmount(String(tx.amount ?? ""));
    setEditNote(tx.note || "");
    setEditMonthKey(tx.monthKey || "");
    setEditStatus(tx.status || "approved");
  }

  function cancelEditTransaction() {
    setEditingTxId("");
    setEditAmount("");
    setEditNote("");
    setEditMonthKey("");
    setEditStatus("");
  }

  async function saveTransactionEdit(tx) {
    const payload = {
      amount: Number(editAmount),
      note: editNote,
    };

    if (tx.type === "deposit") {
      payload.monthKey = editMonthKey;
      payload.status = editStatus;
    }

    await onUpdateEntry(tx.id, payload);
    cancelEditTransaction();
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="tx-list">
        {transactions.map((tx) => (
          <div key={tx.id} className="tx-item">
            <div className="tx-top">
              <strong>
                {tx.type === "deposit" && "입금"}
                {tx.type === "withdrawal" && "출금"}
                {tx.type === "adjustment" && "잔액 조정"}
              </strong>
              <span>
                {tx.type === "withdrawal" ? "-" : ""}
                {money(tx.amount)}원
              </span>
            </div>

            <div className="meta">출처: {sourceLabel(tx.source)}</div>
            <div className="meta">대상: {tx.memberName || "-"}</div>
            <div className="meta">월: {tx.monthKey || "-"}</div>
            <div className="meta">상태: {tx.status}</div>
            <div className="meta">요청일: {toKRDate(tx.requestedAt)}</div>
            <div className="meta">승인일: {toKRDate(tx.approvedAt)}</div>
            {tx.note ? <div className="meta">메모: {tx.note}</div> : null}

            {isAdmin ? (
              <div className="actions" style={{ marginTop: 8 }}>
                {tx.type === "deposit" && tx.status === "pending" ? (
                  <button onClick={() => onApprovePending(tx.id)}>납부 완료</button>
                ) : null}
                <button className="secondary" onClick={() => startEditTransaction(tx)}>
                  수정
                </button>
                <button className="danger" onClick={() => onDeleteEntry(tx.id)}>
                  삭제
                </button>
              </div>
            ) : null}

            {isAdmin && editingTxId === tx.id ? (
              <div className="panel-grid" style={{ marginTop: 8 }}>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="금액"
                />
                {tx.type === "deposit" ? (
                  <input
                    value={editMonthKey}
                    onChange={(e) => setEditMonthKey(e.target.value)}
                    placeholder="월 (YYYY-MM)"
                  />
                ) : null}
                {tx.type === "deposit" ? (
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                ) : null}
                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="메모" />
                <div className="actions">
                  <button onClick={() => saveTransactionEdit(tx)}>저장</button>
                  <button className="secondary" onClick={cancelEditTransaction}>
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            <div className="tx-footer">
              처리 후 잔액: {tx.balanceAfter === null || tx.balanceAfter === undefined ? "-" : `${money(tx.balanceAfter)}원`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
