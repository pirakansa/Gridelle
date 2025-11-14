# BIF (Built-in Functions) リファレンス

Gridelle には WebAssembly を読み込まなくても利用できる「BIF: Built-in Functions」が同梱されています。現在のバージョンでは `sum` と `multiply` の 2 種類が登録済みで、関数メニューまたは YAML から任意のセルに設定できます。本ドキュメントでは BIF の共通仕様と各関数の挙動を説明します。

## 基本的な使い方

### UI から設定する場合
1. 対象セルを選択し、メニューバーの **関数** タブを開きます。
2. 「関数を選択セルに適用」カードで `sum` もしくは `multiply` を選びます（`sum` が既定値）。
3. 「セルを追加」または「選択を追加」ボタンから入力セルを登録します。必要に応じてセルごとにシート名を指定できます。
4. 「適用」ボタンで `func` 定義が YAML に書き込まれ、以後は対象セルが常に再計算されます。

### YAML へ直接記述する場合

```yaml
rows:
  - effort:
      value: ""
      func:
        name: sum             # 関数名
        args:
          cells:
            - row: 2          # 1-based index
              key: effort     # 列キー
            - sheet: バックログ
              row: 3
              key: effort
```

`func` プロパティはシリアライズ時にそのまま保持されるため、UI で再編集することも、テキストで直接修正することも可能です。

## 共通の引数ルール

### `cells`
最も単純な指定方法です。以下のフィールドを持つ配列を渡します。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `row` / `r` | number \| string | 1 始まりの行番号。小数は四捨五入されます。 |
| `key` | string | 列キー。UI の列ヘッダーと一致させます。 |
| `sheet` / `sheetName` | string | 省略時は適用先セルと同じシート。別シートを参照したいときだけ指定します。 |

`column` / `col` / `columnIndex` も利用できます（1 始まりの列番号）。ただし列レイアウトを変更してもキーは安定するため、通常は `key` を推奨します。

### `axis`, `rows`, `columns`, `key`, `keys`
範囲指定を自前で行いたい場合に使います。

- `axis`: `column`（既定）か `row`。行方向に計算したいときだけ `row` を指定します。
- `key`: 単一列を対象にするときのキー。`keys` で複数列を指定可能です。
- `rows`: 行番号、行番号配列、または `{ start: 1, end: 10 }` のようなレンジを指定します（1 始まり）。
- `columns`: 列番号、列番号配列、またはレンジ。列キーが未定義のときに使用します。

`cells` が与えられた場合はそちらが優先され、`axis`／`rows`／`columns` などは無視されます。

### シートをまたぐ参照
`cells[].sheet` にシート名を入れると、アクティブシート以外の値も読み取れます。演算は常に「セルが置かれているシート」単位で行われるため、例えば `バックログ` シートにある関数はそのシートだけで再計算されます。別シートの値を参照した場合でも、ソースシートを編集してから対象シートに戻ると最新値が反映されます。

### 条件演算子（`color_if` で使用）
`color_if` は以下のパラメータで条件を定義します。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `operator` | string | `eq` / `neq` / `gt` / `gte` / `lt` / `lte` / `includes` / `empty` / `not_empty` をサポート。既定は `eq`。 |
| `value` / `values` | string \| number \| array | 比較対象。`values` で複数候補を列挙可能。 |
| `caseInsensitive` | boolean | true の場合は大文字小文字を無視。既定は false。 |
| `mode` | string | `any`（既定）か `all`。`cells` に複数セルを渡した際の真偽判定方法です。 |
| `color` | string | 条件が真だったときに設定する背景色。指定が無い場合は `#fef3c7`。 |
| `elseColor` | string \| null | 条件が偽だったときに適用する背景色。`null` を渡すと背景色をクリアします。 |

## 関数一覧

### `sum`
- **用途**: 指定したセル群の数値を合計します。文字列や空欄は無視されます。
- **戻り値**: 合計値を文字列化したもの。対象がなければ空文字。
- **注意**: 自セルを参照対象に含めていても自動で除外され、無限ループを防ぎます。

**例: 選択セル + 参照セル UI を利用して設定したケース**

```yaml
value: ""
func:
  name: sum
  args:
    cells:
      - row: 4
        key: effort
      - row: 5
        key: effort
    # cells を省略すると選択範囲と axis/key/rows の組み合わせが利用されます
```

### `multiply`
- **用途**: 2 つ以上のセルを掛け合わせます。初期値は 1 で、数値セルのみが演算対象です。
- **戻り値**: 積を文字列化したもの。1 件も数値が無ければ空文字。
- **ユースケース**: 別シートの A/B 値を掛け合わせて C シートに出力する、といった「セル × セル」の算出に向いています。

**例: 別シートのセルを参照するケース**

```yaml
value: ""
func:
  name: multiply
  args:
    cells:
      - sheet: "バックログ"
        row: 4
        key: effort
      - sheet: "完了済み"
        row: 1
        key: effort
```

### `color_if`
- **用途**: 指定したセルの値が条件に一致した場合に背景色を変更します。値自体はそのまま維持されます。
- **戻り値**: 文字列は変更せず、`styles.bgColor` のみを更新します。
- **ユースケース**: ステータス列が `DONE` の場合だけ淡い緑でハイライトする／数値がしきい値を超えたら赤にする 等。

**例: 自セルを判定して背景色を切り替える**

```yaml
value: "DONE"
func:
  name: color_if
  args:
    operator: eq
    value: "DONE"
    color: "#a7f3d0"
    elseColor: null
```

**例: 別セルを参照し、60 を超えたら赤背景にする**

```yaml
value: ""
func:
  name: color_if
  args:
    operator: gt
    value: 60
    color: "#fecaca"
    cells:
      - row: 2
        key: effort
```

## カスタム関数との併用
BIF では補えないロジックを実装したい場合は、`docs/wasm-macro-abi.md` を参考に WebAssembly マクロを作成し、関数メニューの **WASM** セクションで読み込んでください。同じ UI から BIF と WASM 関数を切り替えて利用できます。
