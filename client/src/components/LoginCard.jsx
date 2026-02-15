import { useState } from "react";

export default function LoginCard({ onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onLogin({ name, password });
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
