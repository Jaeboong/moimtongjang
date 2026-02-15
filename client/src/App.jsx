import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function toKRDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ko-KR");
}

function money(value) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${year}.${month}`;
}

function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api.login({ name, password });
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 72 }}>
        <div className="title" style={{ marginBottom: 10 }}>
          모임통장 로그인
        </div>
        <form className="panel-grid" onSubmit={submit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
          />
          {error ? <div className="error">{error}</div> : null}
          <button type="submit">로그인</button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ monthKeys: [], rows: [] });
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [tab, setTab] = useState("monthly");
  const [error, setError] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositMonth, setDepositMonth] = useState("");
  const [depositNote, setDepositNote] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const pendingDeposits = useMemo(
    () => transactions.filter((tx) => tx.type === "deposit" && tx.status === "pending"),
    [transactions]
  );

  async function loadDashboard() {
    const [me, userList, summaryData, txData, balanceData] = await Promise.all([
      api.me(),
      api.listUsers(),
      api.getSummary(),
      api.getTransactions(),
      api.getBalance(),
    ]);

    setUser(me);
    setUsers(userList);
    setSummary(summaryData);
    setTransactions(txData);
    setBalance(balanceData.balance);
    setDepositMonth(summaryData.monthKeys[0] || "");
  }

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    loadDashboard().catch((err) => {
      setError(err.message);
      localStorage.removeItem("token");
    });
  }, []);

  async function reload() {
    setError("");
    try {
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setUsers([]);
    setSummary({ monthKeys: [], rows: [] });
    setTransactions([]);
    setBalance(0);
  }

  async function requestDeposit(event) {
    event.preventDefault();
    setError("");
    try {
      await api.requestDeposit({
        amount: Number(depositAmount),
        monthKey: depositMonth,
        note: depositNote,
      });
      setDepositAmount("");
      setDepositNote("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function decideDeposit(id, action) {
    setError("");
    try {
      await api.decideDeposit(id, action);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createWithdrawal(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createWithdrawal({ amount: Number(withdrawAmount), note: withdrawNote });
      setWithdrawAmount("");
      setWithdrawNote("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createAdjustment(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createAdjustment({ amount: Number(adjustAmount), note: adjustNote });
      setAdjustAmount("");
      setAdjustNote("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createUser({ name: newUserName, password: newUserPassword, role: "user" });
      setNewUserName("");
      setNewUserPassword("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return <Login onLogin={reload} />;
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">모임통장 관리</div>
          <div className="meta">{user.name} ({user.role})</div>
        </div>
        <div>
          <button className="secondary" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 10 }}>{error}</div> : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="meta">현재 잔액</div>
        <div className="balance">{money(balance)}원</div>
      </div>

      <div className="tabs">
        <button className={tab === "monthly" ? "active" : ""} onClick={() => setTab("monthly")}>
          월별 납부 현황
        </button>
        <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>
          입금/출금 내역
        </button>
      </div>

      {tab === "monthly" ? (
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
                    <td>{row.userName}</td>
                    {summary.monthKeys.map((monthKey) => {
                      const cell = row.months[monthKey];
                      return (
                        <td key={monthKey}>
                          <div>
                            <span className={`pill ${cell.status}`}>
                              {cell.status === "paid"
                                ? "완료"
                                : cell.status === "pending"
                                ? "대기"
                                : "미납"}
                            </span>
                          </div>
                          <div>{money(cell.amount)}원</div>
                          {cell.pendingAmount > 0 ? (
                            <div className="meta">요청 {money(cell.pendingAmount)}원</div>
                          ) : null}
                          <div className="meta">요청 {toKRDate(cell.requestedAt)}</div>
                          <div className="meta">승인 {toKRDate(cell.approvedAt)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                <div className="meta">대상: {tx.memberName || "-"}</div>
                <div className="meta">월: {tx.monthKey || "-"}</div>
                <div className="meta">상태: {tx.status}</div>
                <div className="meta">요청일: {toKRDate(tx.requestedAt)}</div>
                <div className="meta">승인일: {toKRDate(tx.approvedAt)}</div>
                {tx.note ? <div className="meta">메모: {tx.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {user.role === "user" ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
            입금 확인 요청
          </div>
          <form className="panel-grid" onSubmit={requestDeposit}>
            <div className="input-row">
              <input
                type="number"
                min="1"
                placeholder="입금 금액"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
              <select value={depositMonth} onChange={(e) => setDepositMonth(e.target.value)} required>
                {summary.monthKeys.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {monthLabel(monthKey)}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="메모(선택)"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
            />
            <button type="submit">요청 제출</button>
          </form>
        </div>
      ) : null}

      {user.role === "admin" ? (
        <>
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
                      <button onClick={() => decideDeposit(tx.id, "approve")}>승인</button>
                      <button className="danger" onClick={() => decideDeposit(tx.id, "reject")}>
                        반려
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
              출금/잔액 조정
            </div>
            <div className="panel-grid two">
              <form className="panel-grid" onSubmit={createWithdrawal}>
                <input
                  type="number"
                  min="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="출금 금액"
                  required
                />
                <input
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="출금 메모"
                />
                <button type="submit">출금 등록</button>
              </form>

              <form className="panel-grid" onSubmit={createAdjustment}>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="조정 금액 (+/-)"
                  required
                />
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="조정 사유"
                />
                <button type="submit">잔액 조정</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
              회원 추가
            </div>
            <form className="panel-grid" onSubmit={createUser}>
              <div className="input-row">
                <input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="회원 이름"
                  required
                />
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="초기 비밀번호"
                  required
                />
              </div>
              <button type="submit">회원 생성</button>
            </form>
            <div className="meta" style={{ marginTop: 8 }}>
              현재 회원 수: {users.filter((item) => item.role === "user").length}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
