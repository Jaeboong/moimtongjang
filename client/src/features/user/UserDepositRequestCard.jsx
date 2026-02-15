import { useEffect, useState } from "react";
import { monthLabel } from "../../utils/format";

export default function UserDepositRequestCard({ monthKeys, onSubmitRequest }) {
  const [amount, setAmount] = useState("");
  const [monthKey, setMonthKey] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setMonthKey((prev) => (prev && monthKeys.includes(prev) ? prev : monthKeys[0] || ""));
  }, [monthKeys]);

  async function submit(event) {
    event.preventDefault();
    await onSubmitRequest({
      amount: Number(amount),
      monthKey,
      note,
    });
    setAmount("");
    setNote("");
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        입금 확인 요청
      </div>
      <form className="panel-grid" onSubmit={submit}>
        <div className="input-row">
          <input
            type="number"
            min="1"
            placeholder="입금 금액"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} required>
            {monthKeys.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </div>
        <textarea placeholder="메모(선택)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit">요청 제출</button>
      </form>
    </div>
  );
}
