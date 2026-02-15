import { useState } from "react";

export default function AdminCashOpsCard({ onCreateWithdrawal, onCreateAdjustment }) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  async function submitWithdrawal(event) {
    event.preventDefault();
    await onCreateWithdrawal({ amount: Number(withdrawAmount), note: withdrawNote });
    setWithdrawAmount("");
    setWithdrawNote("");
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    await onCreateAdjustment({ amount: Number(adjustAmount), note: adjustNote });
    setAdjustAmount("");
    setAdjustNote("");
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        출금/잔액 조정
      </div>
      <div className="panel-grid two">
        <form className="panel-grid" onSubmit={submitWithdrawal}>
          <input
            type="number"
            min="1"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="출금 금액"
            required
          />
          <input value={withdrawNote} onChange={(e) => setWithdrawNote(e.target.value)} placeholder="출금 메모" />
          <button type="submit">출금 등록</button>
        </form>

        <form className="panel-grid" onSubmit={submitAdjustment}>
          <input
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="조정 금액 (+/-)"
            required
          />
          <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="조정 사유" />
          <button type="submit">잔액 조정</button>
        </form>
      </div>
    </div>
  );
}
