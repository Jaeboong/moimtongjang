import { money, monthLabel } from "../../utils/format";

export default function MonthlyStatusCard({
  summary,
  selectedYear,
  availableYears,
  onSelectYear,
  isAdmin,
  onForcePaid,
  onForceUnpaid,
  onForceZeroPaid,
}) {
  const yearOptions = availableYears.length > 0 ? availableYears : [selectedYear];

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="panel-head">
        <div className="title panel-head-title" style={{ fontSize: 16 }}>
          월별 납부 현황
        </div>
        <select className="year-select" value={selectedYear} onChange={(e) => onSelectYear(Number(e.target.value))}>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="month-grid-table">
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
                  {!row.isDonation ? <div className="meta">월회비 {money(row.monthlyFee)}원</div> : null}
                </td>
                {summary.monthKeys.map((monthKey) => {
                  const cell = row.months[monthKey];
                  if (row.isDonation) {
                    return (
                      <td key={monthKey}>
                        <div>입금 {money(cell.amount)}원</div>
                      </td>
                    );
                  }
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
                      {isAdmin && cell.status !== "paid" ? (
                        <div className="month-cell-actions">
                          <button className="secondary mini month-action-btn" onClick={() => onForcePaid(row.userId, monthKey)}>
                            완납 처리
                          </button>
                          <button className="secondary mini month-action-btn" onClick={() => onForceZeroPaid(row.userId, monthKey)}>
                            0원 완납
                          </button>
                        </div>
                      ) : null}
                      {isAdmin && cell.status === "paid" ? (
                        <button
                          className="danger mini month-action-btn"
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
