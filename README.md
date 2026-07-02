# COSS 성과지표 총괄관리 시스템

강원대학교 **데이터보안·활용 혁신융합대학사업단(COSS)**의 성과지표를 총괄 관리하기 위한
내부 업무용 웹 대시보드입니다. 2026년도 3차년도 성과지표의 목표값·실적값·달성률·대학별
배부값·증빙 제출 여부를 한눈에 확인하고, 주관대학(강원대학교) 및 참여대학의 실적을
취합·검증·관리하는 데 사용합니다.

> 참고: 이 프로젝트는 참고 사이트(cossmanage.netlify.app)의 화면 구성과 분위기를 참고하여
> **처음부터 새로 제작**한 독립 프로젝트입니다. 기존 사이트의 코드를 복사하거나 수정하지 않았습니다.

## 주요 특징

- 로그인 후 **관리자(admin) / 대학 담당자(university)** 권한에 따라 메뉴와 데이터 접근 범위가 달라집니다.
- 구글시트를 데이터베이스로, Google Apps Script를 API 서버로 사용합니다.
- **구글시트 API 연동 URL이 설정되지 않았거나 호출에 실패하면 자동으로 샘플 데이터로 대체(fallback)**되어
  화면이 비어 보이지 않습니다.
- 성과지표 총괄 현황, 핵심/자율 성과지표, 대학별 배부·달성 관리, 우선 관리 지표, 목표값 설정,
  사용자 관리, 수정 이력 등 10개 화면을 제공합니다.
- **조회 전용 화면(대시보드/총괄 현황/핵심·자율 지표/우선 관리 지표/수정 이력)은 30초마다 자동으로
  최신 구글시트 데이터를 다시 불러옵니다.** 화면을 새로고침하지 않아도 구글시트를 수정하면 잠시 후
  자동으로 반영됩니다(`src/utils/useAutoRefresh.ts`). 입력 화면(대학별 배부·달성 관리, 목표값 설정,
  사용자 관리)은 작성 중인 내용이 덮어써지지 않도록 자동 새로고침 대상에서 제외했습니다.

## 기술 스택

- React 18 + Vite + TypeScript
- Tailwind CSS
- Recharts (차트)
- lucide-react (아이콘)
- react-router-dom (라우팅)
- Google Apps Script (백엔드 API), Google Sheets (데이터 저장소)
- Netlify (배포)

## 프로젝트 구조

```
src/
  components/
    common/       # StatCard, ProgressBar, Badge, FilterSelect, ExcelDownloadButton 등 공통 UI
    layout/        # Sidebar, Header, Layout
    charts/        # Recharts 기반 차트
    indicators/    # 핵심/자율 성과지표 화면 공용 컴포넌트
    ProtectedRoute.tsx
  pages/           # 화면 단위 페이지 컴포넌트 (10개 화면)
  services/
    api.ts         # GAS API 호출 + 실패 시 샘플 데이터 fallback
    aggregate.ts   # 시트 원본 데이터를 화면용 데이터로 가공하는 순수 함수
    sampleData.ts  # 샘플 데이터 (24개 지표 × 5개 대학)
    localStore.ts  # fallback 모드에서 사용하는 메모리 내 임시 저장소
  types/           # 도메인 타입 정의
  utils/           # 달성률 계산, 상태 판정, 포맷, CSV 다운로드 등
  context/         # AuthContext(로그인 상태), ToastContext(저장 성공/실패 알림)
google-apps-script/
  Code.gs          # Google Apps Script API 서버 코드
```

## 화면 구성

| 화면 | 경로 | 접근 권한 |
|---|---|---|
| 로그인 | `/login` | 전체 |
| 대시보드 | `/dashboard` | 전체 |
| 성과지표 총괄 현황 | `/indicators` | 전체 |
| 핵심 성과지표 | `/indicators/core` | 전체 |
| 자율 성과지표 | `/indicators/autonomous` | 전체 |
| 대학별 배부·달성 관리 | `/university-results` | 전체 (조회·수정 범위는 권한별 상이) |
| 우선 관리 지표 | `/priority` | 전체 |
| 목표값 설정 | `/targets` | 관리자 전용 |
| 사용자 관리 | `/users` | 관리자 전용 |
| 수정 이력 | `/logs` | 관리자 전용 |

## 구글시트 구조

스프레드시트 하나에 아래 5개 시트를 구성합니다. 1행은 반드시 헤더(컬럼명)여야 합니다.

### 1. `indicators` — 성과지표 정의
| indicator_id | year | category | indicator_name | unit | description | status |
|---|---|---|---|---|---|---|
| IND001 | 2026 | 핵심 | 교육과정 참여학생 수 | 명 | COSS 교육과정 참여 학생 수 | 사용 |

### 2. `targets` — 전체 목표값
| target_id | year | indicator_id | total_target | note | updated_at |
|---|---|---|---|---|---|
| T001 | 2026 | IND001 | 500 | 3차년도 목표값 | 2026-07-02 |

### 3. `university_results` — 대학별 배부·실적
| result_id | year | indicator_id | university_name | allocated_target | actual_result | achievement_rate | evidence_status | note | updated_by | updated_at |
|---|---|---|---|---|---|---|---|---|---|---|
| R001 | 2026 | IND001 | 강원대학교 | 100 | 82 | 82 | 제출 | 확인 완료 | admin | 2026-07-02 |

### 4. `users` — 사용자 계정
| user_id | name | email | role | university_name | password | status |
|---|---|---|---|---|---|---|
| U001 | 관리자 | admin@example.com | admin | 전체 | admin1234 | 사용 |

### 5. `logs` — 수정 이력
| log_id | timestamp | user_id | user_name | university_name | action | sheet_name | row_id | field_name | old_value | new_value |
|---|---|---|---|---|---|---|---|---|---|---|
| L001 | 2026-07-02 10:30 | U001 | 관리자 | 전체 | update | university_results | R001 | actual_result | 80 | 82 |

> `logs` 시트는 헤더만 만들어 두면, `updateUniversityResult` / `updateTarget` / `upsertUser` 호출 시
> Apps Script가 자동으로 행을 추가합니다.

## 데이터 처리 규칙

- 달성률 = `actual_result / allocated_target * 100` (소수 첫째 자리 반올림)
- `allocated_target`이 0이거나 비어 있으면 달성률은 `N/A` 처리
- 달성률 100 이상: **정상** / 80 이상 100 미만: **주의** / 80 미만: **미달**
- 실적값이 전혀 입력되지 않은 지표: **미제출**
- 증빙 미제출 건은 경고(붉은색 배지)로 표시
- 목표값·실적값에는 음수를 입력할 수 없음 (프론트엔드 + Apps Script 양쪽에서 검증)
- 저장 성공/실패는 화면 우측 하단 토스트 알림으로 표시

## Google Apps Script API

`google-apps-script/Code.gs` 파일 하나로 구성되어 있으며, 아래 7개(및 화면 지원용 보조 3개) 액션을
`?action=` 파라미터(GET) 또는 JSON body의 `action` 필드(POST)로 라우팅합니다.

| action | 메서드 | 설명 |
|---|---|---|
| `getDashboardData` | GET | 대시보드 요약 통계 |
| `getIndicators` | GET | 지표 목록 (category 파라미터로 핵심/자율 필터) |
| `getUniversityResults` | GET | 대학별 실적 (role, university_name으로 범위 제한) |
| `updateUniversityResult` | POST | 실적값/증빙/비고 수정 + 달성률 자동계산 + 이력 저장 |
| `updateTarget` | POST | 전체/대학별 목표값 수정 (관리자 전용) + 이력 저장 |
| `getPriorityIndicators` | GET | 우선 관리 지표 자동 추출 |
| `login` | POST | 시트 기반 간이 로그인 |
| `getUsers` / `upsertUser` | GET / POST | 사용자 관리 화면 지원 |
| `getChangeLogs` | GET | 수정 이력 화면 지원 |

### Apps Script 배포 방법

1. 구글시트에서 `확장 프로그램 > Apps Script`를 열고 `Code.gs` 내용을 붙여넣습니다.
2. 시트 이름이 `indicators`, `targets`, `university_results`, `users`, `logs`와 정확히 일치하는지 확인합니다.
3. `배포 > 새 배포 > 유형: 웹 앱`을 선택합니다.
   - 실행 계정: **나(본인)**
   - 액세스 권한: **전체 공개(익명 사용자 포함)**
4. 배포 후 발급되는 웹 앱 URL(`https://script.google.com/macros/s/.../exec`)을 복사합니다.
5. 프론트엔드 `.env` 파일의 `VITE_GAS_API_URL`에 이 URL을 설정합니다.

## 환경변수 설정

`.env.example`을 복사해 `.env` 파일을 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

```
# 비워두면 샘플 데이터로 동작, 값을 넣으면 실제 구글시트 데이터를 사용
VITE_GAS_API_URL=https://script.google.com/macros/s/AKfycb.../exec
```

## 로컬 실행

```bash
npm install
npm run dev
```

기본적으로 `.env`가 없으면 **샘플 데이터 모드**로 동작하므로, 별도 설정 없이 바로 화면을 확인할 수 있습니다.
헤더의 "샘플 데이터 / 구글시트 연동" 배지로 현재 데이터 출처를 확인할 수 있습니다.

## Netlify 배포 방법

1. GitHub 저장소를 Netlify에 연결합니다.
2. 빌드 설정 (저장소에 포함된 `netlify.toml`이 자동으로 적용됩니다)
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Netlify **Site settings > Environment variables**에 `VITE_GAS_API_URL`을 등록합니다.
4. 배포 후 SPA 라우팅을 위한 리다이렉트(`/* -> /index.html`)는 `netlify.toml`에 이미 설정되어 있습니다.

## 샘플 데이터

`src/services/sampleData.ts`에 24개 성과지표(핵심 12개 + 자율 12개) × 5개 참여대학의 배부·실적
데이터, 6개 사용자 계정, 6건의 수정 이력이 포함되어 있습니다. 일부 지표는 의도적으로
달성률 80% 미만(미달), 증빙 미제출, 실적 미입력 상태로 구성되어 **우선 관리 지표** 화면과
경고 표시 기능을 바로 확인할 수 있습니다.

### 테스트 계정 (샘플 데이터 기준)

| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 관리자 | admin@coss.kangwon.ac.kr | admin1234 |
| 강원대학교 담당자 | kw@coss.kangwon.ac.kr | kw1234 |
| 아주대학교 담당자 | ajou@coss.kangwon.ac.kr | ajou1234 |
| 충남대학교 담당자 | cnu@coss.kangwon.ac.kr | cnu1234 |
| 한양대학교 ERICA 담당자 | hyu@coss.kangwon.ac.kr | hyu1234 |
| 영남이공대학교 담당자 | ync@coss.kangwon.ac.kr | ync1234 |

> 실제 운영 시에는 `users` 시트의 비밀번호를 반드시 변경하고, 필요 시 별도 인증 체계로 교체하세요.

## 사용 방법

### 관리자(admin)

1. 로그인 후 전체 메뉴에 접근할 수 있습니다.
2. **대시보드**에서 전체/핵심/자율 지표 달성률, 대학별 비교, 우선 관리 지표를 확인합니다.
3. **성과지표 총괄 현황**에서 지표구분·대학명·달성상태·증빙여부로 필터링하고 엑셀(CSV)로 내려받습니다.
4. **대학별 배부·달성 관리**에서 모든 대학의 실적을 조회·수정할 수 있습니다.
5. **목표값 설정**에서 지표별 전체 목표값과 대학별 배부 목표값을 수정합니다(수정일·수정자 자동 기록).
6. **사용자 관리**에서 계정을 추가하고 권한·소속대학·사용 여부를 설정합니다.
7. **수정 이력**에서 모든 변경 내역을 추적합니다.

### 대학 담당자(university)

1. 로그인 후 목표값 설정, 사용자 관리, 수정 이력 메뉴는 표시되지 않습니다.
2. **대학별 배부·달성 관리**에서 본인 소속 대학의 실적만 조회·입력할 수 있습니다.
3. 실적값을 입력하고, 증빙 제출 여부(제출/미제출/해당없음)를 선택한 뒤 비고를 작성하고 **저장**합니다.
4. 저장 시 달성률이 자동 계산되고 성공/실패 알림이 표시됩니다.

## 라이선스 / 문의

본 프로젝트는 강원대학교 데이터보안·활용 혁신융합대학사업단 내부 업무용으로 제작되었습니다.
