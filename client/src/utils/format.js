export function toKRDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ko-KR");
}

export function money(value) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function monthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-");
  return year && month ? `${year}.${month}` : "-";
}

export function sourceLabel(source) {
  if (source === "user_request") return "유저 요청";
  if (source === "admin_direct") return "관리자 직접 입금";
  if (source === "admin_sponsorship") return "찬조금";
  if (source === "admin_force_paid") return "관리자 완납 처리";
  if (source === "admin_withdrawal") return "관리자 출금";
  if (source === "admin_adjustment") return "관리자 조정";
  return "-";
}
