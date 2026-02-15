import { useState } from "react";

export default function ChangePasswordCard({ onChangePassword }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function submit(event) {
    event.preventDefault();
    await onChangePassword({ currentPassword, newPassword });
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        내 비밀번호 변경
      </div>
      <form className="panel-grid" onSubmit={submit}>
        <div className="input-row">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호"
            required
          />
        </div>
        <button type="submit">비밀번호 변경</button>
      </form>
    </div>
  );
}
