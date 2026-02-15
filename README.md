# 모임통장 관리 도구

모바일 우선 단일 페이지 구성의 모임통장 관리 앱입니다.

## 기술 스택
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (Atlas 가능)
- CI/CD: GitHub Actions

## 핵심 기능
- 이름 + 비밀번호 로그인
- 관리자/유저 권한 분리
- 월별 납부 현황 테이블
- 유저 입금 확인 요청
- 관리자 승인/반려
- 관리자 출금 등록
- 관리자 잔액 조정
- 실시간 잔액 집계

## 프로젝트 구조
```text
.
├─ client
│  └─ src
├─ server
│  └─ src
└─ .github/workflows
```

## 로컬 실행
1. 의존성 설치
```bash
npm install
```

2. 환경 변수 파일 생성
```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

3. 개발 서버 실행
```bash
npm run dev
```

- client: http://localhost:5173
- server: http://localhost:4000

## 기본 관리자 계정
`server/.env`의 값으로 최초 1회 자동 생성됩니다.
- ADMIN_NAME=admin
- ADMIN_PASSWORD=admin1234

운영에서는 반드시 변경하세요.

## MongoDB Atlas 연결
`server/.env`의 `MONGODB_URI`를 Atlas 연결 문자열로 바꾸면 됩니다.
예시:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/meeting_account?retryWrites=true&w=majority
```

## GitHub Actions 배포 훅
`.github/workflows/ci-cd.yml`은 main 브랜치 push 시 CI 후 선택적으로 배포 훅을 호출합니다.

Repository Secrets 중 필요 항목만 설정:
- `RENDER_DEPLOY_HOOK_URL` (백엔드)
- `NETLIFY_BUILD_HOOK_URL` (프론트엔드)

둘 다 없으면 CI만 수행합니다.
