import { money, monthLabel, toKRDate } from "../../utils/format";

export default function MonthlyStatusCard({ summary, isAdmin, onForcePaid, onForceUnpaid, onForceZeroPaid }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>회원</th>
              {summary.monthKeys.map((monthKey) => (
                <th key={monthKey}>{monthLabel(monthKey)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.userId}>
                <td>
                  <div>{row.userName}</div>
                  <div className="meta">월회비 {money(row.monthlyFee)}원</div>
                </td>
                {summary.monthKeys.map((monthKey) => {
                  const cell = row.months[monthKey];
                  return (
                    <td key={monthKey}>
                      <div>
                        <span className={`pill ${cell.status}`}>
                          {cell.status === "paid"
                            ? "완료"
                            : cell.status === "partial"
                            ? "부분납부"
                            : cell.status === "pending"
                            ? "대기"
                            : "미납"}
                        </span>
                      </div>
                      <div>납부 {money(cell.amount)}원</div>
                      <div className="meta">기준 {money(cell.dueAmount)}원</div>
                      {cell.pendingAmount > 0 ? <div className="meta">요청 {money(cell.pendingAmount)}원</div> : null}
                      <div className="meta">요청 {toKRDate(cell.requestedAt)}</div>
                      <div className="meta">승인 {toKRDate(cell.approvedAt)}</div>
                      {isAdmin && cell.status !== "paid" ? (
                        <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                          <button
                            className="secondary mini"
                            onClick={() => onForcePaid(row.userId, monthKey)}
                          >
                            완납 처리
                          </button>
                          <button
                            className="secondary mini"
                            onClick={() => onForceZeroPaid(row.userId, monthKey)}
                          >
                            0원 완납
                          </button>
                        </div>
                      ) : null}
                      {isAdmin && cell.status === "paid" ? (
                        <button
                          className="danger mini"
                          style={{ marginTop: 6 }}
                          onClick={() => onForceUnpaid(row.userId, monthKey)}
                        >
                          미납 처리
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
