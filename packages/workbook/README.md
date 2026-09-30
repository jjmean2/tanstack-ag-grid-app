# @lab/workbook

클라이언트 state 위에 **스프레드시트 같은 양식**을 만드는 라이브러리입니다. 타입이 있는 셀, 고정 수식, 여러 sheet와 탭, 화면 간 참조를 다룹니다. 세무조서처럼 "여러 grid와 input으로 이루어진, 서로 연결된 큰 양식"을 위해 만들었습니다.

```
store (입력값만) ──(정의: sheets · layout · 수식)──▶ buildWorkbook ──▶ Workbook (셀 · 값 · 오류)
      ▲                                                                   │
      └──────────────── 편집: cell.write(value) ◀── 뷰 (grid · input · 서식) ◀┘
```

- **state가 원본**입니다. 합계나 수식 결과는 state에 두지 않습니다.
- **Workbook은 파생값**입니다. state가 바뀔 때마다 순수 함수 `buildWorkbook`이 통째로 다시 만듭니다.
- **뷰는 셀만 봅니다.** AG Grid, input, 서식은 모두 같은 셀을 보여주고, 편집은 셀의 `write`로 state에 돌아갑니다.

## 진입점

| import                             | 내용                                                                                  | 의존           |
| ---------------------------------- | ------------------------------------------------------------------------------------- | -------------- |
| `@lab/workbook`                    | 모델, 수식, 정의·계산, layout 헬퍼, store, 저장소                                     | 없음 (순수 TS) |
| `@lab/workbook/react`              | Provider, `useCell`/`CellInput`, `FormSheet`, 수식 바, 외부 참조 패널, error boundary | React          |
| `@lab/workbook/ag-grid`            | `SheetGrid`, `SheetGridProvider`                                                      | React, AG Grid |
| `@lab/workbook/ag-grid/styles.css` | grid sheet의 행·셀 클래스 (`sheet-title` 등)                                          | —              |

의존 방향은 **core ← react ← ag-grid** 한 방향입니다. 패키지는 앱 코드를 import하지 않습니다. 둘 다 [boundaries.test.ts](src/boundaries.test.ts)가 검사합니다.

## 디렉토리

```
src/
├─ index.ts            @lab/workbook 공개 API
├─ core/               모델과 계산 (React·AG Grid 없음)
│  ├─ types.ts           WorkbookDef · SheetDef(grid | form) · CellSpec · Cell · Workbook …
│  ├─ address.ts         주소: sheet/row/col · sheet/@group/col · ext:screen/name
│  ├─ cell-types.ts      T.text · T.money · T.date · T.select … (표시·파싱·수식 변환)
│  ├─ workbook.ts        defineWorkbook · buildWorkbook (행 전개 → 수식 평가 → 조회 함수)
│  ├─ check.ts           checkWorkbook: 대표 state로 정의 오류 점검 (테스트용)
│  ├─ external.ts        화면 간: export 스냅샷 만들기, 외부 값 조회
│  ├─ navigation.ts      UI state: 탭 · 포커스 · 셀 이동 요청
│  └─ formula/           파서 · 평가기 · 함수 (SUM, IF, SUMIF, ROUND, DAYS …)
├─ layout/             state → 행(grid sheet) · 칸(form sheet)
│  ├─ cells.ts           literalCell · labelCell · inputCell · boundCell · formulaCell
│  ├─ grid.ts            title · items · fields · subtotal · addRow · row · spanned
│  ├─ form.ts            textBox · cellBox
│  └─ state.ts           (내부) state 조각 읽기·쓰기
├─ store/              createStore: 가장 작은 외부 store
├─ persistence/        screenStorage: 화면 state와 export 저장 (지금은 localStorage)
├─ react/              React 바인딩과 grid에 묶이지 않은 뷰
│  ├─ workbook-context.tsx  WorkbookProvider · useWorkbook · useFocusAddress
│  ├─ use-store.ts          useStore (useSyncExternalStore)
│  ├─ cell-input.tsx        useCell · CellInput
│  ├─ form-sheet.tsx        FormSheet (CSS grid)
│  ├─ formula-bar.tsx       FormulaBar
│  ├─ external-refs.tsx     ExternalRefs
│  └─ error-boundary.tsx    WorkbookErrorBoundary
└─ ag-grid/            AG Grid 어댑터
   ├─ use-sheet-grid.ts     SheetView → AG Grid props
   ├─ columns.ts            Cell → ColDef (콜백은 셀만 읽음)
   ├─ full-width-row.tsx    제목·추가 버튼 행
   ├─ grid-config.tsx       SheetGridProvider (테마 주입)
   └─ styles.css
```

## 양식 하나 만들기

```ts
import { defineWorkbook, items, subtotal, title, T } from '@lab/workbook'

export const def = defineWorkbook<MyState>(
  [
    {
      // grid sheet (AG Grid)
      id: 'adj',
      title: '소득금액조정',
      tab: 'adjustment',
      columns: [
        {
          colId: 'account',
          headerName: '계정과목',
          type: T.text,
          editable: true,
        },
        { colId: 'tax', headerName: '세법상', type: T.money, editable: true },
      ],
      layout: [
        title('t', 'Ⅰ. 익금산입'),
        items('adds'), // state.adds → 행, 그룹 @adds
        subtotal('sum', '소 계', 'adds', ['tax']), // =SUM([@adds/tax])
      ],
    },
    {
      // form sheet (종이 서식처럼 칸 배치)
      kind: 'form',
      id: 'ret',
      title: '신고서',
      tab: 'return',
      tracks: ['6rem', '1fr', '10rem'],
      layout: [
        (ctx) => [
          textBox([1, 1, 2, 1], '과세표준', 'head'), // [행, 열, 행병합, 열병합]
          cellBox([1, 3], 'base/amount', formulaCell('=[adj/sum/tax]')),
        ],
      ],
    },
  ],
  { exports: { base: 'ret/base/amount' } }, // 다른 화면이 [ext:<화면>/base]로 참조
)
```

뷰에서는 이렇게 씁니다.

```tsx
<WorkbookProvider store={store} def={def} ui={ui}>
  <FormulaBar />
  <SheetGrid sheetId="adj" />
  <FormSheet sheetId="ret" />
  <CellInput address="adj/sum/tax" />
</WorkbookProvider>
```

양식마다 테스트에 `checkWorkbook(def, { 샘플들 })`을 두세요. layout은 state의 함수라서, 특정 데이터에서만 생기는 정의 오류(행 ID 충돌, 없는 행을 가리키는 수식)는 그 데이터를 넣어 봐야 드러납니다.

## 무엇을 어디에 두나

| 여기에 둔다              | 예                                                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| **정의** (`WorkbookDef`) | 셀이어야 하는 것: 수식이 참조하는 값, 수식 바·셀 이동의 대상, grid 안의 행 |
| **JSX** (앱)             | 그 밖의 화면: 섹션 제목, 각주, 설명, 탭 구성, grid·input 배치              |

계산값에 따라 달라지는 문구는 JSX에서 `useWorkbook().wb.value(address)`로 읽으면 됩니다.

## 앱이 맡는 일

- **AG Grid 모듈 등록**: `ModuleRegistry.registerModules([...])`. grid sheet에는 client-side row model, 행 병합(`CellSpanModule`), 편집기 모듈이 필요합니다.
- **테마**: `<SheetGridProvider theme={...}>`로 감쌉니다. 없으면 AG Grid 기본 테마입니다.
- **CSS**: `@lab/workbook/ag-grid/styles.css`를 한 번 import합니다.
- **Tailwind**: `react/`와 `ag-grid/`의 컴포넌트는 Tailwind 클래스를 씁니다. Tailwind는 `node_modules`를 스캔하지 않으므로, 앱 CSS에 `@source '../node_modules/@lab/workbook/src';`처럼 등록해야 합니다.
- **React와 AG Grid는 한 벌**: 둘 다 peer dependency입니다. AG Grid는 모듈 등록이 사본마다 따로라서, 두 벌이면 등록한 기능이 보이지 않습니다. 앱의 Vite 설정에 `resolve.dedupe`를 두는 것을 권합니다.
- **라우팅**: 라이브러리는 route를 모릅니다. 다른 화면을 여는 방법은 `WorkbookProvider`의 `openScreen`으로 주입합니다.

## 알려진 제약

- **재계산은 통째로 합니다.** 편집할 때마다 workbook 전체를 다시 계산합니다. 셀 수만 개까지는 수십 ms 수준입니다. 대용량 원천 데이터는 셀 밖에 두고 집계만 셀로 두세요.
- **grid sheet의 병합**: 병합 열(`spanRows`)은 편집할 수 없고, 다른 셀의 가로 병합(`span`)이 병합 열을 덮을 수 없습니다(AG Grid 제약). 임의의 직사각형 병합이 필요하면 form sheet를 쓰세요.
- **form sheet에는 그룹 참조(`[@group/col]`)가 없습니다.** 늘어나는 목록은 grid sheet로 두고 참조하세요.
- **뷰 컴포넌트의 색과 문구**(한국어 라벨)는 지금은 고정입니다.

## 개발

이 저장소의 pnpm workspace 안에 있고, 앱은 `"@lab/workbook": "workspace:*"`로 의존합니다. `exports`가 `src/`의 TypeScript를 직접 가리키므로 빌드 단계 없이 앱의 Vite가 그대로 변환합니다.

```bash
pnpm --filter @lab/workbook test        # 패키지 테스트 (의존 방향 검사 포함)
pnpm --filter @lab/workbook typecheck
```

## 저장소 밖으로 발행하려면

- 빌드 단계를 추가합니다(예: tsup으로 `dist/`를 만들고 `exports`를 `dist`로 변경).
- `private: false`로 바꾸고 버전을 관리합니다.
- CSS와 Tailwind 클래스 처리(위의 `@source`)를 사용하는 앱에 안내합니다.
