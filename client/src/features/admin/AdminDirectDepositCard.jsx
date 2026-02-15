import { useEffect, useState } from "react";
import { monthLabel } from "../../utils/format";

export default function AdminDirectDepositCard({ depositTargets, monthKeys, onSubmitDeposit }) {
  const [memberId, setMemberId] = useState("");
  const [monthKey, setMonthKey] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setMemberId((prev) => (prev && depositTargets.some((target) => target.id === prev) ? prev : depositTargets[0]?.id || ""));
  }, [depositTargets]);

  useEffect(() => {
    setMonthKey((prev) => (prev && monthKeys.includes(prev) ? prev : monthKeys[0] || ""));
  }, [monthKeys]);

  async function submit(event) {
    event.preventDefault();
    await onSubmitDeposit({
      memberId,
      monthKey,
      amount: Number(amount),
      note,
    });
    setAmount("");
    setNote("");
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        관리자 직접 입금
      </div>
      <form className="panel-grid" onSubmit={submit}>
        <div className="input-row">
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
            {depositTargets.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} required>
            {monthKeys.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </div>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="입금 금액"
          required
        />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모(선택)" />
        <button type="submit">직접 입금 등록</button>
      </form>
    </div>
  );
}
