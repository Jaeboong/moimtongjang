export default function WakeScreen() {
  return (
    <div className="container wake-container">
      <div className="card wake-card">
        <div className="title" style={{ marginBottom: 8 }}>
          서버 깨우는 중
        </div>
        <div className="meta">Render 무료 플랜은 첫 요청에 최대 1분 정도 걸릴 수 있습니다.</div>
      </div>
    </div>
  );
}
