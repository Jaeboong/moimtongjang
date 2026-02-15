import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import LoginCard from "./components/LoginCard";
import ChangePasswordCard from "./features/account/ChangePasswordCard";
import AdminCashOpsCard from "./features/admin/AdminCashOpsCard";
import AdminDirectDepositCard from "./features/admin/AdminDirectDepositCard";
import AdminMemberManagementCard from "./features/admin/AdminMemberManagementCard";
import AdminPendingRequestsCard from "./features/admin/AdminPendingRequestsCard";
import TransactionsCard from "./features/ledger/TransactionsCard";
import MonthlyStatusCard from "./features/monthly/MonthlyStatusCard";
import MonthlyTotalsCard from "./features/monthly/MonthlyTotalsCard";
import UserDepositRequestCard from "./features/user/UserDepositRequestCard";
import { money } from "./utils/format";

const DONATION_TARGET = {
  id: "donation",
  name: "찬조금",
  role: "special",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ monthKeys: [], rows: [] });
  const [monthlyTotals, setMonthlyTotals] = useState({ monthKeys: [], totals: [] });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [tab, setTab] = useState("monthly");
  const [error, setError] = useState("");

  const members = useMemo(() => users.filter((item) => item.role === "user"), [users]);
  const depositTargets = useMemo(() => [...members, DONATION_TARGET], [members]);
  const pendingDeposits = useMemo(
    () => transactions.filter((tx) => tx.type === "deposit" && tx.status === "pending"),
    [transactions]
  );

  async function loadDashboard(year = selectedYear) {
    const [me, userList, summaryData, totalsData, txData, balanceData] = await Promise.all([
      api.me(),
      api.listUsers(),
      api.getSummary(year),
      api.getMonthlyTotals(year),
      api.getTransactions(),
      api.getBalance(),
    ]);

    setUser(me);
    setUsers(userList);
    setSummary(summaryData);
    setMonthlyTotals(totalsData);
    setAvailableYears(summaryData.availableYears || totalsData.availableYears || []);
    const nextSelectedYear = summaryData.selectedYear || totalsData.selectedYear;
    if (nextSelectedYear && nextSelectedYear !== selectedYear) {
      setSelectedYear(nextSelectedYear);
    }
    setTransactions(txData);
    setBalance(balanceData.balance);
  }

  async function reload() {
    setError("");
    try {
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    loadDashboard(selectedYear).catch((err) => {
      setError(err.message);
      localStorage.removeItem("token");
      setUser(null);
    });
  }, [selectedYear]);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setUsers([]);
    setSummary({ monthKeys: [], rows: [] });
    setMonthlyTotals({ monthKeys: [], totals: [] });
    setTransactions([]);
    setBalance(0);
  }

  async function runAction(action) {
    setError("");
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin({ name, password }) {
    const data = await api.login({ name, password });
    localStorage.setItem("token", data.token);
    await loadDashboard(selectedYear);
  }

  async function handleChangePassword(payload) {
    await runAction(() => api.changePassword(payload));
  }

  async function handleRequestDeposit(payload) {
    await runAction(() => api.requestDeposit(payload));
  }

  async function handleForcePaid(memberId, monthKey) {
    await runAction(() => api.forcePaidDeposit({ memberId, monthKey, note: "관리자 완납 처리" }));
  }

  async function handleForceUnpaid(memberId, monthKey) {
    await runAction(() => api.forceUnpaidDeposit({ memberId, monthKey }));
  }

  async function handleForceZeroPaid(memberId, monthKey) {
    await runAction(() => api.forceZeroPaidDeposit({ memberId, monthKey }));
  }

  async function handleApprovePending(id) {
    await runAction(() => api.decideDeposit(id, "approve"));
  }

  async function handleRejectPending(id) {
    await runAction(() => api.decideDeposit(id, "reject"));
  }

  async function handleAdminDeposit(payload) {
    await runAction(() => api.adminDeposit(payload));
  }

  async function handleCreateWithdrawal(payload) {
    await runAction(() => api.createWithdrawal(payload));
  }

  async function handleCreateAdjustment(payload) {
    await runAction(() => api.createAdjustment(payload));
  }

  async function handleCreateUser(payload) {
    await runAction(() => api.createUser(payload));
  }

  async function handleUpdateMonthlyFee(userId, monthlyFee) {
    await runAction(() => api.updateMonthlyFee(userId, monthlyFee));
  }

  async function handleUpdateEntry(id, payload) {
    await runAction(() => api.updateLedgerEntry(id, payload));
  }

  async function handleDeleteEntry(id) {
    await runAction(() => api.deleteLedgerEntry(id));
  }

  if (!user) {
    return <LoginCard onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">모임통장 관리</div>
          <div className="meta">
            {user.name} ({user.role})
          </div>
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
        <button className={tab === "totals" ? "active" : ""} onClick={() => setTab("totals")}>
          월별 합계
        </button>
        <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>
          입금/출금 내역
        </button>
      </div>

      {tab === "monthly" ? (
        <MonthlyStatusCard
          summary={summary}
          selectedYear={selectedYear}
          availableYears={availableYears}
          onSelectYear={setSelectedYear}
          isAdmin={user.role === "admin"}
          onForcePaid={handleForcePaid}
          onForceUnpaid={handleForceUnpaid}
          onForceZeroPaid={handleForceZeroPaid}
        />
      ) : null}

      {tab === "totals" ? (
        <MonthlyTotalsCard
          totalsData={monthlyTotals}
          selectedYear={selectedYear}
          availableYears={availableYears}
          onSelectYear={setSelectedYear}
        />
      ) : null}

      {tab === "ledger" ? (
        <TransactionsCard
          transactions={transactions}
          isAdmin={user.role === "admin"}
          onApprovePending={handleApprovePending}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      ) : null}

      <UserDepositRequestCard monthKeys={summary.monthKeys} onSubmitRequest={handleRequestDeposit} />

      {user.role === "admin" ? (
        <>
          <AdminPendingRequestsCard
            pendingDeposits={pendingDeposits}
            onApprove={handleApprovePending}
            onReject={handleRejectPending}
          />

          <AdminDirectDepositCard
            depositTargets={depositTargets}
            monthKeys={summary.monthKeys}
            onSubmitDeposit={handleAdminDeposit}
          />

          <AdminCashOpsCard
            onCreateWithdrawal={handleCreateWithdrawal}
            onCreateAdjustment={handleCreateAdjustment}
          />

          <AdminMemberManagementCard
            members={members}
            onCreateUser={handleCreateUser}
            onUpdateMonthlyFee={handleUpdateMonthlyFee}
          />
        </>
      ) : null}

      <ChangePasswordCard onChangePassword={handleChangePassword} />
    </div>
  );
}
