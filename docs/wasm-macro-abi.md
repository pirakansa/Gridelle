# WASM マクロ ABI ガイド

Gridelle で読み込む WebAssembly (WASM) マクロは、以下の ABI (Application Binary Interface) に従う必要があります。サンプル実装は `public/macros/sample_sum.wat` / `sample_sum.wasm` を参照してください。

## 実装要件

1. **`memory` エクスポート必須**
   - `memory (export "memory") <initial-pages>` を定義し、ホストが入力値を書き込めるようにします。
   - メモリ初期サイズは 1 ページ（64 KiB）で構いませんが、ホスト側で必要に応じて grow される前提です。

2. **計算関数のエクスポート**
   - 引数: `(param $ptr i32) (param $len i32)`  
     - `$ptr`: `memory` 内に格納された `len` 個の `f64` 配列の先頭ポインタ。
     - `$len`: 配列要素数。
   - 戻り値: `f64`（または `i32` など数値型）。ホスト側で文字列に変換してセルに反映します。
   - 例:  
     ```wat
     (func (export "sumRange") (param $ptr i32) (param $len i32) (result f64)
       ;; ptr から始まる f64 配列を合計する処理
     )
     ```
   - 複数の関数をエクスポートした場合、それぞれがマクロ候補として登録されます。識別子は `wasm:{moduleId}.{exportName}` になります。

3. **メモリアクセス**
   - 入力は常に `f64` 配列として渡されます。`i32.add` / `i32.shl` などでアドレス計算し、`f64.load` で読み出してください。
   - 例: `f64.load (i32.add (local.get $ptr) (i32.shl (local.get $index) (i32.const 3)))`

4. **副作用禁止 (推奨)**
   - 現状ホストはインポート関数を提供していません。処理は純粋計算で完結させてください。

## ホスト側引数の構築

ユーザーが UI で関数を適用すると、以下の情報が `func` 定義として保存され、`applyCellFunctions` 実行時にホストから WASM 関数へ入力が渡されます。

```yaml
value: ""
func:
  name: "wasm:sample_sum.sumRange"
  args:
    key: "effort"        # 対象列
    rows:
      start: 2           # 1-based index
      end: 10
```

| フィールド | 意味 |
| --- | --- |
| `name` | 登録済みマクロ ID。`wasm:{moduleId}.{exportName}` 形式。 |
| `args.key` | 計算対象の列キー。未指定の場合はセル自身の列。 |
| `args.rows.start` / `end` | 1-based 行番号で計算対象範囲を指定。省略時は全行。 |

ホストは `args` をもとに対象セル値を `Float64Array` で確保し、`ptr=0` から順に書き込みます。`len` は配列長です。

## 戻り値の反映

WASM 関数が返した `f64` 値は文字列化されてセルに保存されます。`NaN` や `undefined` を返した場合は空文字になります。複数セルを選択して適用した場合は、同じ設定が選択範囲全体に複製されます。

## 開発フロー

1. `.wat` などで WASM を作成し、`wasm32-unknown-unknown` ターゲットでビルド。
2. 生成した `.wasm` を `public/macros/` など静的にアクセスできる場所へ配置。
3. Gridelle UI の「関数」タブで `モジュールID` と `WASMファイルURL` を指定してロード。
4. 読み込まれたエクスポートを選択し、対象列・行範囲を指定して適用。

## 注意事項

- `memory` を複数持つモジュールや、`start` 関数で重い処理を行うモジュールは想定していません。
- 実行中に例外が発生した場合、ホストはログに警告を出し、セル値を空文字に戻します。
- ABI は暫定仕様です。将来的に `ptr` を非 0 オフセットにしたり、`env` インポートを追加する可能性があります。README やリリースノートで告知予定です。
