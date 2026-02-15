import { money, toKRDate } from "../../utils/format";

export default function AdminPendingRequestsCard({ pendingDeposits, onApprove, onReject }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        입금 요청 처리
      </div>
      {pendingDeposits.length === 0 ? (
        <div className="meta">처리할 요청이 없습니다.</div>
      ) : (
        <div className="tx-list">
          {pendingDeposits.map((tx) => (
            <div key={tx.id} className="tx-item">
              <div className="tx-top">
                <strong>{tx.memberName || "-"}</strong>
                <span>{money(tx.amount)}원</span>
              </div>
              <div className="meta">월: {tx.monthKey}</div>
              <div className="meta">요청일: {toKRDate(tx.requestedAt)}</div>
              <div className="actions" style={{ marginTop: 8 }}>
                <button onClick={() => onApprove(tx.id)}>승인</button>
                <button className="danger" onClick={() => onReject(tx.id)}>
                  반려
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
