import { useEffect, useState } from "react";
import { money } from "../../utils/format";

export default function AdminMemberManagementCard({ members, onCreateUser, onUpdateMonthlyFee }) {
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserMonthlyFee, setNewUserMonthlyFee] = useState("");

  const [feeUserId, setFeeUserId] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  useEffect(() => {
    if (!members.length) {
      setFeeUserId("");
      setFeeAmount("");
      return;
    }

    const selectedExists = members.some((member) => member.id === feeUserId);
    const selected = selectedExists ? members.find((member) => member.id === feeUserId) : members[0];

    if (!selectedExists) {
      setFeeUserId(selected.id);
    }
    setFeeAmount(String(selected?.monthlyFee || 0));
  }, [members, feeUserId]);

  async function submitCreateUser(event) {
    event.preventDefault();
    await onCreateUser({
      name: newUserName,
      password: newUserPassword,
      role: "user",
      monthlyFee: Number(newUserMonthlyFee || 0),
    });
    setNewUserName("");
    setNewUserPassword("");
    setNewUserMonthlyFee("");
  }

  async function submitMonthlyFee(event) {
    event.preventDefault();
    await onUpdateMonthlyFee(feeUserId, Number(feeAmount));
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
          회원 추가
        </div>
        <form className="panel-grid" onSubmit={submitCreateUser}>
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
          <input
            type="number"
            min="0"
            value={newUserMonthlyFee}
            onChange={(e) => setNewUserMonthlyFee(e.target.value)}
            placeholder="월 회비 금액"
          />
          <button type="submit">회원 생성</button>
        </form>
        <div className="meta" style={{ marginTop: 8 }}>
          현재 회원 수: {members.length}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
          멤버 월 회비 설정
        </div>
        <form className="panel-grid" onSubmit={submitMonthlyFee}>
          <div className="input-row">
            <select value={feeUserId} onChange={(e) => setFeeUserId(e.target.value)} required>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              placeholder="월 회비"
              required
            />
          </div>
          <button type="submit">월 회비 저장</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
          멤버 비밀번호 조회 (관리자)
        </div>
        <div className="tx-list">
          {members.map((member) => (
            <div key={member.id} className="tx-item">
              <div className="tx-top">
                <strong>{member.name}</strong>
                <span>월회비 {money(member.monthlyFee)}원</span>
              </div>
              <div className="meta">비밀번호: {member.passwordView || "(미확인)"}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
