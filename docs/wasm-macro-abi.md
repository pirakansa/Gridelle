# WASM マクロ ABI ガイド

Gridelle で読み込む WebAssembly (WASM) マクロは、以下の ABI (Application Binary Interface) に従う必要があります。サンプル実装は `public/macros/sample_macros.wat` / `sample_macros.wasm` を参照してください（`sumRange` は最小構成、`color_if` はスタイル指示バッファを利用する応用例です）。

## 実装要件

1. **`memory` エクスポート必須**
   - `memory (export "memory") <initial-pages>` を定義し、ホストが入力値を書き込めるようにします。
   - メモリ初期サイズは 1 ページ（64 KiB）で構いませんが、ホスト側で必要に応じて grow される前提です。

2. **計算関数のエクスポート**
   - 引数: `(param $ptr i32) (param $len i32) (param $stylePtr i32?)`  
     - `$ptr`: `memory` 内に格納された `len` 個の `f64` 配列の先頭ポインタ。
     - `$len`: 配列要素数。
     - `$stylePtr`: 任意。スタイル指示を書き込む 16 バイト領域の先頭アドレス。第3引数を受け取らない既存モジュールもそのまま利用できます。
   - 戻り値: `f64`（または `i32` など数値型）。ホスト側で文字列に変換してセルに反映します。
   - 例:  
     ```wat
     (func (export "sumRange") (param $ptr i32) (param $len i32) (param $stylePtr i32) (result f64)
       ;; ptr から始まる f64 配列を合計する処理
     )
     ```
   - 複数の関数をエクスポートした場合、それぞれがマクロ候補として登録されます。識別子は `wasm:{moduleId}.{exportName}` になります。

3. **メモリアクセス**
   - 入力は常に `f64` 配列として渡されます。`i32.add` / `i32.shl` などでアドレス計算し、`f64.load` で読み出してください。
   - 例: `f64.load (i32.add (local.get $ptr) (i32.shl (local.get $index) (i32.const 3)))`

4. **副作用禁止 (推奨)**
   - 現状ホストはインポート関数を提供していません。処理は純粋計算で完結させてください。

### スタイル指示バッファ

第3引数 (`$stylePtr`) を受け取る関数は、そこから 16 バイトの構造体にアクセスしてセルの装飾を指示できます。ホストは呼び出し前にすべて 0 を書き込みます。

| オフセット | 型   | 内容 |
| --- | --- | --- |
| `+0` | `i32` | フラグ。bit0=文字色、bit1=背景色。 |
| `+4` | `i32` | 文字色 (`0xRRGGBB`)。負値で色クリア。 |
| `+8` | `i32` | 背景色 (`0xRRGGBB`)。負値で色クリア。 |
| `+12` | `i32` | 予約領域（将来拡張用）。 |

フラグと値をセットした項目のみが UI に反映されます。スタイルを変更しない場合は 0 のままで構いません。

## ホスト側引数の構築

ユーザーが UI で関数を適用すると、以下の情報が `func` 定義として保存され、`applyCellFunctions` 実行時にホストから WASM 関数へ入力が渡されます。

```yaml
value: ""
func:
  name: "wasm:sample_macros.sumRange"
  args:
    axis: "column"       # 既定値。row を指定すると行方向に走査
    key: "effort"        # 対象列キー
    rows:
      start: 2           # 1-based index
      end: 10
```

行方向の集計やセル参照も定義できます。

```yaml
func:
  name: "wasm:sample_macros.rowSum"
  args:
    axis: "row"
    rows: 3
    columns:
      start: 1
      end: 4   # 3行目の1〜4列を対象にするケース
```

```yaml
func:
  name: "wasm:custom.multiply"
  args:
    cells:
      - row: 2
        key: "A"
      - row: 2
        columnIndex: 2
```

### スタイル出力を行うサンプル (`sample_macros.color_if`)
`sample_macros.wasm` には 0 より大きな値を検知して淡い緑にする `color_if` 関数も含まれています。選択したセルの値を読み取り、スタイル指示バッファへ `bgColor = #a7f3d0` を書き込むサンプルです。

```yaml
value: ""
func:
  name: "wasm:sample_macros.color_if"
  args:
    key: effort
    rows:
      start: 2
      end: 10
```

0 以下の値は背景色がクリアされるため、条件付きフォーマットの雰囲気を手軽に試せます。

| フィールド | 意味 |
| --- | --- |
| `name` | 登録済みマクロ ID。`wasm:{moduleId}.{exportName}` 形式。 |
| `args.axis` | `column`（既定）で列方向、`row` で行方向。 |
| `args.key` / `args.keys` | 列キー。複数列を列挙する場合は `keys` 配列を使用。 |
| `args.columns` | 列インデックスの範囲（1-based）。行集計時に便利です。 |
| `args.rows` | 行インデックス。単一値 / 配列 / `{start, end}` を指定可能。 |
| `args.cells` | 個別セル参照。`row` + `key`（または `columnIndex`）を複数並べられます。 |

ホストは `args` をもとに対象セル値を `Float64Array` で確保し、`ptr=0` から順に書き込みます。`len` は配列長です。

## 戻り値の反映

WASM 関数が返した `f64` 値は文字列化されてセルに保存されます。`NaN` や `undefined` を返した場合は空文字になります。  
第3引数を利用した場合は、スタイル指示バッファに書き込んだ文字色 / 背景色がセルに適用されます（`0xRRGGBB` 形式、負値でクリア）。  
複数セルを選択して適用した場合は、同じ設定が選択範囲全体に複製されます。

## 開発フロー

1. `.wat` などで WASM を作成し、`wasm32-unknown-unknown` ターゲットでビルド。
2. 生成した `.wasm` を `public/macros/` など静的にアクセスできる場所へ配置。
3. Gridelle UI の「関数」タブで `モジュールID` と `WASMファイルURL` を指定してロード。
4. 読み込まれたエクスポートを選択し、対象列・行範囲を指定して適用。

## 注意事項

- `memory` を複数持つモジュールや、`start` 関数で重い処理を行うモジュールは想定していません。
- 実行中に例外が発生した場合、ホストはログに警告を出し、セル値を空文字に戻します。
- ABI は暫定仕様です。将来的に `ptr` を非 0 オフセットにしたり、`env` インポートを追加する可能性があります。README やリリースノートで告知予定です。
