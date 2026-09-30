# @lab/workbook

클라이언트 state 위에 **스프레드시트 같은 양식**을 만드는 라이브러리입니다. 타입이 있는 셀, 고정 수식, 여러 sheet, 화면 간 참조를 다룹니다. 세무조서처럼 "여러 grid와 input으로 이루어진, 서로 연결된 큰 양식"을 위해 만들었습니다.

```
store (입력값만) ──(정의: sheets · rows · 수식)──▶ buildWorkbook ──▶ Workbook (셀 · 값 · 오류)
      ▲                                                                   │
      └──────────────── 편집: cell.write(value) ◀── 뷰 (grid · input · 서식) ◀┘
```

- **state가 원본**입니다. 합계나 수식 결과는 state에 두지 않습니다.
- **Workbook은 파생값**입니다. state가 바뀔 때마다 순수 함수 `buildWorkbook`이 통째로 다시 만듭니다.
- **뷰는 셀만 봅니다.** AG Grid, input, 서식은 모두 같은 셀을 보여주고, 편집은 셀의 `write`로 state에 돌아갑니다.
- **정의는 셀만 말합니다.** 어느 셀이 어느 탭·어느 칸에 놓이는지는 뷰(앱의 JSX와 서식 배치)가 정합니다.

## 진입점

| import                     | 내용                                                                                         | 의존           |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| `@lab/workbook`            | 모델, 수식, 정의·계산, 행 헬퍼, 세션(`createSession`), export 스냅샷                         | 없음 (순수 TS) |
| `@lab/workbook/react`      | Provider, `useCell`/`CellInput`, `FormSheet`와 배치(`textBox`/`cellBox`), 수식 바, 외부 참조 | React          |
| `@lab/workbook/ag-grid`    | `SheetGrid`, `defineCellViews` (편집기·표시 부품과 표시 규칙을 한 값으로)                    | React, AG Grid |
| `@lab/workbook/styles.css` | 구조 스타일만 (배치, 간격). 색과 글꼴은 앱 테마가 표식으로 정함. 유틸리티 CSS 불필요         | —              |

의존 방향은 **core ← react ← ag-grid** 한 방향입니다. 패키지는 앱 코드를 import하지 않습니다. 둘 다 [boundaries.test.ts](src/boundaries.test.ts)가 검사합니다.

## 디렉토리

```
src/
├─ index.ts            @lab/workbook 공개 API
├─ styles.css          구조 스타일 (@lab/workbook/styles.css)
├─ core/               모델과 계산 (React·AG Grid 없음)
│  ├─ types.ts           정의(…Def) → 명세(…Spec) → 결과(Cell · Row · Sheet · Workbook)
│  ├─ address.ts         주소: sheet/row/col · sheet/@group/col · ext:screen/name
│  ├─ cell-types.ts      T.text · T.money · T.date · T.select … (표시·파싱·수식 변환)
│  ├─ workbook.ts        defineWorkbook · buildWorkbook (행 전개 → 수식 평가 → 조회 함수)
│  ├─ session.ts         createSession: state · UI · 다른 화면 export, 세 store
│  ├─ check.ts           checkWorkbook: 대표 state로 정의 오류 점검 (테스트용)
│  ├─ external.ts        screenExports: 이 화면이 내보내는 값의 스냅샷
│  ├─ navigation.ts      UI state: 포커스 · 셀 이동 요청(pending)
│  ├─ marks.ts           표식: 셀의 사실에서 나오는 wb-* 클래스
│  ├─ presentation.ts    표시 규칙: 셀 → 편집기·표시·정렬·표식 (모든 뷰 공통)
│  └─ formula/           파서 · 평가기 · 함수 (SUM, IF, SUMIF, ROUND, DAYS …)
├─ layout/             state → 행
│  ├─ cells.ts           literalCell · labelCell · inputCell · boundCell · formulaCell
│  ├─ grid.ts            title · items · fields · subtotal · addRow · row · spanned
│  └─ state.ts           (내부) state 조각 읽기·쓰기
├─ store/              createStore: 가장 작은 외부 store
├─ react/              React 바인딩과 grid에 묶이지 않은 뷰
│  ├─ workbook-context.tsx  WorkbookProvider · useWorkbook · useFocusAddress
│  ├─ views.ts              CellViews (표시 규칙 + input 부품) · defineInputViews
│  ├─ use-store.ts          useStore (useSyncExternalStore)
│  ├─ cell-input.tsx        useCell · CellInput
│  ├─ input-editors.tsx     input 편집기 부품과 기본값
│  ├─ form-layout.ts        서식 배치: textBox · cellBox · checkBoxes
│  ├─ form-sheet.tsx        FormSheet (CSS grid)
│  ├─ use-formula-bar.ts    useFormulaBar · useExternalRefs (수식 바·외부 참조의 데이터와 동작)
│  ├─ formula-bar.tsx       FormulaBar (useFormulaBar의 기본 화면)
│  ├─ external-refs.tsx     ExternalRefs
│  └─ error-boundary.tsx    WorkbookErrorBoundary
└─ ag-grid/            AG Grid 어댑터
   ├─ views.ts              defineCellViews · grid 편집기·표시 기본값
   ├─ use-sheet-grid.ts     Sheet → AG Grid props
   ├─ columns.ts            Cell → ColDef (콜백은 셀만 읽음)
   └─ full-width-row.tsx    제목·추가 버튼 행
```

## 양식 하나 만들기

```ts
import {
  defineWorkbook,
  formulaCell,
  items,
  row,
  subtotal,
  title,
  T,
} from '@lab/workbook'

export const def = defineWorkbook<MyState>(
  [
    {
      id: 'adj',
      title: '소득금액조정',
      columns: [
        {
          colId: 'account',
          headerName: '계정과목',
          type: T.text,
          editable: true,
        },
        { colId: 'tax', headerName: '세법상', type: T.money, editable: true },
      ],
      rows: [
        title('t', 'Ⅰ. 익금산입'),
        items('adds'), // state.adds → 행, 그룹 @adds
        subtotal('sum', '소 계', 'adds', ['tax']), // =SUM([@adds/tax])
      ],
    },
    {
      // 종이 서식에 놓일 sheet도 같은 행 정의입니다. 칸 배치는 뷰가 합니다.
      id: 'ret',
      title: '신고서',
      columns: [{ colId: 'amount', headerName: '금액', type: T.money }],
      rows: [
        row('base', { label: '과세표준' }, () => ({
          amount: formulaCell('=[adj/sum/tax]'),
        })),
      ],
    },
  ],
  { exports: { base: 'ret/base/amount' } }, // 다른 화면이 [ext:<화면>/base]로 참조
)
```

뷰에서는 세션 하나와 뷰 설정 하나를 Provider에 주고, 그 안에 원하는 뷰를 놓습니다.

```tsx
const session = createSession(def, initialState, { externals }) // 컴포넌트 밖, 또는 useState로 한 번

<WorkbookProvider session={session} views={cellViews} openScreen={openScreen}>
  <FormulaBar />
  <SheetGrid sheetId="adj" />
  <FormSheet
    sheet="ret"
    tracks={['6rem', '1fr']}
    boxes={[
      textBox([1, 1], '과세표준', 'head'), // [행, 열, 행병합?, 열병합?]
      cellBox([1, 2], 'base/amount'), // 이 sheet의 "row/col"
    ]}
  />
  <CellInput address="adj/sum/tax" />
</WorkbookProvider>
```

탭은 라이브러리가 모릅니다. 앱이 탭마다 담는 sheet를 알고, `ui`의 `pending`(셀 이동 요청)이 다른 탭의 sheet를 가리키면 그 탭으로 바꾸면 됩니다. 요청은 대상 뷰가 마운트될 때 가져갑니다.

양식마다 테스트에 `checkWorkbook(def, { 샘플들 })`을 두세요. 행은 state의 함수라서, 특정 데이터에서만 생기는 정의 오류(행 ID 충돌, 없는 행을 가리키는 수식)는 그 데이터를 넣어 봐야 드러납니다. 서식 배치는 `checkBoxes(열 수, boxes)`로 겹침과 범위를 검사할 수 있습니다(`FormSheet`도 개발 모드에서 검사합니다).

## 무엇을 어디에 두나

| 여기에 둔다              | 예                                                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| **정의** (`WorkbookDef`) | 셀이어야 하는 것: 수식이 참조하는 값, 수식 바·셀 이동의 대상, grid 안의 행 |
| **뷰** (앱)              | 그 밖의 화면: 섹션 제목, 각주, 설명, 탭 구성, grid·input·서식 칸 배치      |

계산값에 따라 달라지는 문구는 JSX에서 `useWorkbook().wb.value(address)`로 읽으면 됩니다.

## 표시: 태그, 표시 규칙, 테마

양식 정의는 **보이는 방식을 말하지 않고 의미만** 말합니다. 셀이 어떤 편집기로, 어떤 정렬로, 어떤 모양으로 보이는지는 세 단계로 정해집니다.

```
① 의미 (정의)          tags: 'subtotal', 'input', 'pass' …       양식 작성자
                       type: T.money, write 유무, 수식 여부      (셀의 사실)
        │
② 표시 규칙 (JS)       cell → { editor, display, align, marks }   기본 규칙: 라이브러리 (core/presentation.ts)
        │              editor: 'date' | 'select' | … | null       덮어쓰기: 앱 한 파일 (defineCellViews의 rules)
        │              marks: wb-cell wb-type-money wb-editable wb-tag-subtotal …
        ├──▶ 렌더러 등록표   'date' → AG Grid agDateStringCellEditor / <input type="date">
        ▼
③ 모양 (앱 테마 CSS)   .wb-cell.wb-editable { color: blue }        매핑은 이 파일 한 곳에
```

grid 칸, `CellInput`, 서식 칸은 모두 **같은 표시 결과**를 씁니다. 그래서 한 셀은 어느 뷰에서나 같은 편집기, 같은 정렬, 같은 표식을 갖습니다.

### 표시 규칙과 부품: `defineCellViews`

앱은 셀 표시를 **한 값**으로 정합니다. 규칙, 그리고 규칙이 쓰는 앱 고유 ID 뒤의 부품입니다.

```tsx
// 앱: 한 파일에서 (데모 앱의 shared/ui/workbook-view/cell-views.tsx)
export const cellViews = defineCellViews({
  gridTheme: myGridTheme,
  editors: {
    // 편집기 ID마다 grid 부품과 input 부품이 모두 필요합니다 (타입이 검사)
    'code-search': { grid: { component: CodeSearchGridEditor }, input: CodeSearchInput },
  },
  displays: { status: { grid: StatusCell } },
  rules: [
    { when: (f) => typeof f.value === 'number' && f.value < 0, then: { marks: ['wb-negative'] } },
    { when: (f) => f.tags.includes('code'), then: { editor: 'code-search' } }, // 오타면 타입 오류
  ],
})

<WorkbookProvider session={session} views={cellViews} …>
```

- 규칙은 셀의 사실(`type`, `writable`, `formula`, `error`, `tags`, `value`)을 보고 `editor`, `display`, `align`, `marks`를 정합니다. **순서대로 적용되고, 뒤의 규칙이 이기며, `marks`는 누적**됩니다.
- 기본값(라이브러리): 쓸 수 있는 셀이면 타입의 편집기(`T.date` → 날짜 선택기, `T.select` → 드롭다운), `action`이 있으면 버튼, 타입의 정렬.
- 규칙은 셀을 **읽기 전용으로 만들 수는 있지만 편집 가능하게 만들 수는 없습니다.** 쓸 수 있는지는 정의(`write`)가 정합니다.
- **표시 형식(`format`)은 규칙이 아니라 셀 타입이 정합니다.** 형식은 입력 해석, 수식 변환과 짝을 이뤄야 하므로, 형식이 다르면 다른 타입을 씁니다.
- 규칙이 쓰는 ID는 내장(`text`, `number`, `select`, `checkbox`, `date` / `text`, `button`)이거나 위에 등록된 것이어야 하고, 편집기는 grid와 input 부품이 둘 다 있어야 합니다. **둘 다 타입이 검사합니다.**
- AG Grid 없이 input과 서식만 쓰는 앱은 `@lab/workbook/react`의 `defineInputViews`를 씁니다.

### 표식

| 표식                                                   | 뜻                                                     |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `wb-cell`, `wb-type-<id>`                              | 셀, 그리고 셀 타입 (`wb-type-money`, `wb-type-date` …) |
| `wb-source-value` / `wb-source-formula`                | 값의 출처                                              |
| `wb-editable`, `wb-error`, `wb-action`                 | 편집 가능(표시 규칙 결과), 수식 오류, 버튼 칸          |
| `wb-align-right` / `wb-align-center`                   | 표시 규칙이 정한 정렬                                  |
| 앱 규칙이 추가한 표식                                  | 예: `wb-negative`                                      |
| `wb-tag-<tag>`                                         | 정의의 태그. 셀 자신과 **그 행의 태그**가 모두 붙음    |
| `wb-row`                                               | grid 행 (행 태그도 붙음)                               |
| `wb-input`, `wb-input-field` / `-form`, `wb-invalid`   | `CellInput`과 그 상태 (형식이 틀린 입력)               |
| `wb-form`, `wb-box`, `wb-box-text` / `-cell` / `-tall` | 서식형 sheet와 칸                                      |
| `wb-button`, `wb-full-width`                           | 라이브러리가 그리는 버튼, 전체 폭 행                   |
| `wb-formula-bar-*`, `wb-ref`, `wb-ref-external`        | 수식 바와 그 안의 참조 (다른 화면이면 `-external`)     |
| `wb-external-refs-*`, `wb-error-boundary-*`            | 외부 참조 패널, 오류 화면                              |

태그는 셀·행에, 그리고 서식 배치의 칸에 붙입니다. 값에 따라 달라지면 함수로 줍니다.

```ts
row('gap', { tags: 'total' }, () => ({
  tax: formulaCell('=[total/tax]-[reported/tax]', {
    tags: ({ value }) => (value === 0 ? 'pass' : 'fail'),
  }),
}))
textBox([3, 1, 9, 1], '과세표준 및 매출세액', 'head')
```

### 테마

테마 예:

```css
.wb-cell.wb-editable {
  color: var(--wb-editable);
} /* 규칙: 편집 가능하면 파란색 */
.wb-type-money {
  font-variant-numeric: tabular-nums;
} /* 규칙: 금액은 자릿수 정렬 */
.wb-tag-subtotal {
  background: var(--wb-subtotal-bg);
  font-weight: 700;
} /* 태그 */
.wb-editable.wb-type-date {
  text-decoration: underline dotted;
} /* 조합 */
```

규칙과 테마를 각각 앱 한 파일에 모으고, **정의·배치가 쓰는 모든 태그와 규칙이 추가하는 모든 표식이 테마에 있는지 테스트로 확인**하는 방식을 권합니다(데모 앱의 `shared/ui/workbook-view/view.test.ts`). 태그는 자유 문자열이라, 이 검사가 없으면 오타나 스타일 누락이 조용히 지나갑니다.

## 사람이 덮어쓸 수 있는 수식 셀

수식 셀 중 정의에서 고른 셀만 사람이 값을 직접 입력해 덮어쓸 수 있습니다. 입력한 값은 수식 결과와 같은 형식이고(금액이면 금액), 지우면 다시 수식 결과가 됩니다.

```ts
// state: { ..., overrides: { c18Tax?: number } }  화면마다 한 곳에 모읍니다
tax: formulaCell('=MIN(ROUND([.amount]*1.3/100,0),10000000)', {
  override: overrideOf(ctx, 'overrides', 'c18Tax'), // 이 셀만 덮어쓰기 가능
}),
```

- **값은 state에 있습니다.** 덮어쓴 값은 `overrides.c18Tax`에 들어가고, 되돌리면 그 키가 지워집니다. 저장, 복원, 변경 여부, 초기화가 다른 입력과 똑같이 동작합니다. `overrides` 객체가 없는 옛 state도 "덮어쓰지 않음"으로 읽습니다.
- **계산**: 수식은 항상 계산합니다. 덮어쓴 동안에는 셀 값과 이 셀을 참조하는 수식이 사람의 값을 쓰고, 수식 결과는 `cell.override.computed`에 남습니다. 수식이 오류여도 덮어쓴 셀에는 오류가 나지 않습니다.
- **만들어진 셀**: `cell.write`(쓸 수 있으면 있음), `cell.override = { active, revert, computed? }`. 뷰는 `cell.write`만 봅니다. 사람의 입력은 `commitInput(cell, input)` 한 곳에서 해석합니다. 덮어쓰기 가능한 셀에서는 빈 입력이 "수식으로 되돌리기"입니다.
- **표시**: 셀의 사실 `overridden`, 표식 `wb-overridden`. 덮어쓰기 가능한 셀은 `writable`이라 타입의 편집기가 붙습니다.
- **되돌리기**: 값 지우기(grid, input, 서식 칸, grid의 Delete 키), grid 우클릭 메뉴 "수식으로 되돌리기"(AG Grid Enterprise 컨텍스트 메뉴. 문구는 `defineCellViews({ texts })`), 수식 바의 버튼(`useFormulaBar().revert`).
- 병합 열(`spanRows`)에는 둘 수 없습니다. 목록 열의 수식(`LeafColumnDef.formula`)은 아직 덮어쓸 수 없습니다.

## 수식 바를 바꾸려면

단계가 셋입니다. 필요한 만큼만 내려가세요.

1. **모양**: 테마 CSS에서 `wb-formula-bar-*`, `wb-ref`를 꾸밉니다.
2. **문구**: `<FormulaBar texts={{ noCell: 'No cell', raw: 'Raw' }} />`. 기본값은 `formulaBarTexts`입니다.
3. **구성**: `useFormulaBar()`로 직접 그립니다. 포커스된 셀, 이름표, 출처(수식·입력·고정), 값, 그리고 수식 조각을 줍니다. 참조 조각에는 대상의 이름표·값과 `follow()`가 들어 있습니다(이 workbook의 셀·목록으로 이동하거나, 다른 화면을 엽니다). 따라가기 로직은 라이브러리에 남고, 앱은 화면만 그립니다.

```tsx
function MyFormulaBar() {
  const bar = useFormulaBar()
  if (!bar.cell) return null
  return (
    <div>
      <b>{bar.label}</b> = {bar.value}
      {bar.parts.map((p, i) =>
        p.ref ? (
          <button key={i} onClick={p.ref.follow}>
            {p.ref.label}
          </button>
        ) : (
          p.text
        ),
      )}
    </div>
  )
}
```

외부 참조 패널도 같습니다: `ExternalRefs`(`texts`) 또는 `useExternalRefs()`. 데모 앱의 소득금액조정 화면이 3단계의 예입니다(`widgets/adjustment-sheet/ui/compact-formula-bar.tsx`).

## 앱이 맡는 일

- **AG Grid 모듈 등록**: `ModuleRegistry.registerModules([...])`. grid sheet에는 client-side row model, 행 병합(`CellSpanModule`), 편집기 모듈이 필요합니다.
- **AG Grid 테마**: `defineCellViews`의 `gridTheme`. 없으면 AG Grid 기본 테마입니다.
- **CSS**: `@lab/workbook/styles.css`(구조)를 import하고, 그 뒤에 앱의 **테마**(표식 → 모양)를 둡니다. 위의 "테마"를 보세요. 라이브러리 뷰는 다른 CSS 프레임워크를 쓰지 않습니다.
- **저장**: 라이브러리는 저장하지 않습니다. 앱이 state와 `screenExports(wb, 화면, 제목)`를 저장하고, 다른 화면의 저장된 export를 `createSession`의 `externals`로 넘깁니다(바뀌면 `session.externals.set`).
- **탭**: 위의 "양식 하나 만들기" 끝을 보세요.
- **React와 AG Grid는 한 벌**: 둘 다 peer dependency입니다. AG Grid는 모듈 등록이 사본마다 따로라서, 두 벌이면 등록한 기능이 보이지 않습니다. 앱의 Vite 설정에 `resolve.dedupe`를 두는 것을 권합니다.
- **라우팅**: 라이브러리는 route를 모릅니다. 다른 화면을 여는 방법은 `WorkbookProvider`의 `openScreen`으로 주입합니다.

## 알려진 제약

- **재계산은 통째로 합니다.** 편집할 때마다 workbook 전체를 다시 계산합니다. 셀 수만 개까지는 수십 ms 수준입니다. 대용량 원천 데이터는 셀 밖에 두고 집계만 셀로 두세요.
- **grid sheet의 병합**: 병합 열(`spanRows`)은 편집할 수 없고, 다른 셀의 가로 병합(`span`)이 병합 열을 덮을 수 없습니다(AG Grid 제약). 임의의 직사각형 병합이 필요하면 `FormSheet` 배치를 쓰세요.
- **서식 배치는 고정입니다.** 늘어나는 목록은 grid로 두고 참조하세요.
- **뷰 컴포넌트의 문구**는 한국어가 기본입니다. `FormulaBar`와 `ExternalRefs`는 `texts` prop으로, grid의 우클릭 메뉴는 `defineCellViews({ texts })`로 바꿀 수 있고, 나머지는 고정입니다. 색과 글꼴은 테마가 정합니다.

## 개발

이 저장소의 pnpm workspace 안에 있고, 앱은 `"@lab/workbook": "workspace:*"`로 의존합니다. `exports`가 `src/`의 TypeScript를 직접 가리키므로 빌드 단계 없이 앱의 Vite가 그대로 변환합니다.

```bash
pnpm --filter @lab/workbook test        # 패키지 테스트 (의존 방향 검사 포함)
pnpm --filter @lab/workbook typecheck
```

## 저장소 밖으로 발행하려면

- 빌드 단계를 추가합니다(예: tsup으로 `dist/`를 만들고 `exports`를 `dist`로 변경).
- `private: false`로 바꾸고 버전을 관리합니다.
- `styles.css`와 표식 목록을 사용하는 앱에 안내합니다.
