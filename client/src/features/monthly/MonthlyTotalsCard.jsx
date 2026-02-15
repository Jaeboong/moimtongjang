import { money, monthLabel } from "../../utils/format";

export default function MonthlyTotalsCard({ totalsData, selectedYear, availableYears, onSelectYear }) {
  const yearOptions = availableYears.length > 0 ? availableYears : [selectedYear];
  const monthKeys = totalsData.monthKeys || [];
  const totalsByMonth = Object.fromEntries((totalsData.totals || []).map((row) => [row.monthKey, row]));

  function value(monthKey, key) {
    return totalsByMonth[monthKey]?.[key] || 0;
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="panel-head">
        <div className="title panel-head-title" style={{ fontSize: 16 }}>
          월별 수입/지출 합계
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
              <th>구분</th>
              {monthKeys.map((monthKey) => (
                <th key={monthKey}>{monthLabel(monthKey)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>수입 합계</td>
              {monthKeys.map((monthKey) => (
                <td key={monthKey}>{money(value(monthKey, "income"))}원</td>
              ))}
            </tr>
            <tr>
              <td>지출 합계</td>
              {monthKeys.map((monthKey) => (
                <td key={monthKey}>{money(value(monthKey, "expense"))}원</td>
              ))}
            </tr>
            <tr>
              <td>월 순증감</td>
              {monthKeys.map((monthKey) => (
                <td key={monthKey}>{money(value(monthKey, "net"))}원</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
