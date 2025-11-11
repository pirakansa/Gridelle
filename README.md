<p align="center">
	<img src="public/images/icon-512x512.png" alt="Gridelle ロゴ" width="320">
</p>

# Gridelle

Gridelle は、YAML ファイルをスプレッドシートのように編集・レビューできる Web アプリケーションです。GitHub 上の構成ファイルを扱う際の「差分が読みづらい」「一覧性が低い」という課題を解決するために、表形式 UI と YAML 変換を往復できる体験を提供します。

運用中の環境: [http://gridelle.piradn.com/](http://gridelle.piradn.com/)

## 主な機能

### スプレッドシート編集
- セル選択・Shift+クリックで矩形選択、フィルハンドルで繰り返しコピー。
- Enter で編集モード、Shift+Enter で改行、Esc でキャンセル。
- 行・列の追加／削除、並べ替え、選択範囲の一括入力。
- セルの文字色・背景色を保持し、YAML へもシリアライズ。
- 複数シートをタブで切り替え、リネームや追加・削除が可能。

### YAML 入出力
- 「YAML入力 / プレビュー」モーダルで YAML テキストを直接編集。
- `.yml` / `.yaml` / `.json` などのファイルを取り込み、表へ展開。
- 現在のワークブック状態を YAML としてダウンロード／コピー。
- 解析エラーや適用結果を通知領域で共有。

### GitHub 連携プレビュー
- Blob URL 指定で単一ファイルを即時ロード。
- PR モードは今後の差分確認機能を想定した UI プレースホルダー。

## セットアップ

### 前提
- Node.js 18 以降
- npm

### 初期化
```bash
npm install
```

## 利用可能なスクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Vite 開発サーバーを起動します。 |
| `npm run build` | プロダクションビルドを生成します。 |
| `npm run type-check` | TypeScript 型チェックを実行します。 |
| `npm run lint` | ESLint を実行し、警告ゼロを維持します。 |
| `npm run test` | Vitest でユニットテストを実行します。 |

## 認証バリアントの切り替え

ログインページは `src/pages/login/App.<variant>.tsx` という命名規則のコンポーネントを参照し、`VITE_LOGIN_APP` で指定したバリアントをビルド時に選択します（既定値は `firebase`）。例:

```bash
# Firebase 認証（デフォルト）
npm run build

# Amazon Cognito など別実装を用いたい場合
VITE_LOGIN_APP=cognito npm run build
```

新しいバリアントを追加する場合は、`App.<variant>.tsx` 内で必要に応じて `configureAuthClient()` を呼び出し、認証クライアント（Firebase / Cognito / 社内SSO など）を初期化してください。UI を共通化したい場合は Firebase 実装（`App.firebase.tsx`）を再利用し、認証レイヤーのみ差し替える構成がおすすめです。

## 開発ガイドライン

1. ブランチは `main` から作成し、GitHub Flow を採用します。
2. 機能追加時は `npm run type-check && npm run lint && npm run test && npm run build` をローカルで実行してから PR を作成します。
3. 新しい挙動にはユニットテストを追加し、既存テストの回帰を防ぎます。
4. 仕様や UI を変える場合、README または `docs/` 配下の関連文書を更新します。
5. PR 作成時は Motivation / Design / Tests / Risks を記載し、必要に応じて `docs/` に補足資料を置きます。

## ドキュメント構成

- `README.md`: プロジェクト概要とセットアップ手順（本ファイル）。
- `docs/`: 補足ドキュメント。大規模 YAML の生成スクリプトや WASM マクロ ABI の仕様などを保管しています。
- `AGENTS.md`: AI エージェント向けの開発ルール。コミット方針やコード記述ルールを記載しています。

## 補足情報

- UI コンポーネントは `src/components/` に、ページ固有ロジックは `src/pages/` に配置します。
- GitHub 連携サービスは `src/services/githubRepositoryAccessService.ts` で提供し、URL 解析や Octokit 経由の API 呼び出しを集約しています。
- YAML の解析と適用は `src/pages/top/useSpreadsheetDataController.ts` と `src/services/yaml*` 系 Web Worker が担当します。
- 関数マクロ機能は現在実験中であり、仕様が予告なく変更される可能性があります。
- 本リポジトリで公開しているソースコードは `LICENSE` に記載のとおり MIT License の下で提供します。
- Gridelle を商用サービスや大規模な社内利用向けに弊サーバー上でホスティングする場合は無償提供の対象外となるため、別途ご相談ください。

Issue / PR を作成する際は、変化点の背景とテスト結果を明記し、変更がユーザーに与える影響を簡潔にまとめてください。
