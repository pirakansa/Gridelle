# AGENTS.md

このドキュメントは **AI コーディングエージェント用 README** です。人間開発者向けの `README.md` を補完し、エージェントが安全かつ効率的に開発を行うための指針を示します。

---

## 1. セットアップ手順

* 推奨環境：VS Code Dev Container / GitHub Codespaces（`.devcontainer/` のイメージを使用）
* 初回起動時：プロジェクトルートで `npm install` を実行し、依存関係を確認
* タスクランナー：`npm`（CI では後述の npm ターゲットを使用）

---

## 2. ビルドと実行

* ビルド：`npm run build`
* Lint：`npm run lint`
* テスト：`npm run test`
* 開発中の実行：`npm run dev`
* クリーンアップ：ビルド成果物（例：`./dist/`）を削除  
  `rm -rf ./dist/`（`npm run clean` と同等）

---

## 3. プロジェクト構成

プロジェクト構成方針は以下の通りです。

```

.
├─ src/<name>.html         # Rollup エントリーポイント
├─ src/<name>.tsx
├─ src/assets/            # 画像やスタイルシートなどの静的アセット
│   └── images/
├─ src/utils/             # ヘルパー関数やユーティリティ
│   ├── Global.scss
│   ├── Theme.ts
│   └── responseUtils.ts
├─ src/pages/<name>/      # ページ固有のレイアウトとコンポーネント
│   └── App.tsx
├─ src/components/        # 再利用可能な React コンポーネント
│   ├── atom/
│   │  ├── SearchText.tsx
│   │  └── Button.tsx
│   └── block/
│       ├── UserLists.tsx
│       └── Header.tsx
├─ src/services/          # API リクエストや認証などのサービスロジック
│   ├── api.ts
│   └── models/
├─ public/                # 静的ファイル（HTML、アイコンなど）
│   ├── robots.txt
│   └── images/favicon.png
├─ dist/                  # ビルド成果物（自動生成、Git 管理対象外）
├─ package.json           # ビルド / テスト / リリースタスク定義
└─ docs/                  # ドキュメント類

```

### 役割とガイドライン

* 共有ロジックは `src/utils/` または `src/services/` に、共有UIは `src/components/` に配置する。小さなプリミティブは `atom/`、複合コンポーネントは `block/` に。
* ページ固有コードは `src/pages/<name>/` に限定する。
* `src/<name>.tsx` はブートストラップやルーティングのみに使用し、ビジネスロジックは記述しない。
* API リクエストや認証、データモデルは `src/services/` 以下に配置。
* 画像やグローバルスタイルは `src/assets/` に、完全な静的ファイル（`robots.txt` など）は `public/` に配置。
* テストコードは対象コードと同じディレクトリ内に配置（例：`src/pages/<name>/__tests__/*.test.ts`）。

### エージェント専用ルール

* 新規ファイルは上記ディレクトリ構造に従って配置し、不要なトップレベルディレクトリは追加しない。
* 既存関数を変更した場合は、ユニットテストを追加または更新し、`npm run test` が成功することを確認。
* ファイル書き込みや外部リソースアクセス時は、一時ディレクトリを使用し、既存テストデータを上書きしない。

---

## 4. コーディング規約

* 常に `npm run lint` を実行して、Lint チェックを通過させ、フォーマットを統一する。
* Lint 警告を残したままにしない（CI 必須条件）。
* エラーを黙って無視しない。ユーザー向けのエラーメッセージには `console.error` を使用。
* マジックナンバーやハードコードされたURLは意味のある定数としてモジュール内に定義。
* 大規模かつ無関係なリファクタリングを避け、変更範囲を最小限に。
* 以下を最低限の必須コメントとする：
  * ファイルヘッダー
  * 関数ヘッダー
* 実装とコメントは常に同期させること。

---

## 5. テストと検証

* ユニットテスト：`npm run test`
* コマンド動作に変更があった場合は、`README.md` の使用例および `test` 配下のフィクスチャと整合性を保つ。

### 静的解析 / Lint / 脆弱性スキャン

* 静的解析：`npm run type-check`
* コード品質：`npm run lint`
* 脆弱性スキャン：`npm audit`

---

## 6. CI 要件

GitHub Actions（`.github/workflows/static.yml`）は以下を実行します：

* `npm run type-check`
* `npm run lint`
* `npm run test`
* `npm run build`

PR 作成前にローカルでこれらがすべて成功することを確認してください。失敗した場合は、ローカルでフォーマット・検証を行い、再実行します。

---

## 7. セキュリティとデータ取扱い

* 秘密情報や機密データをコミットしない。
* 個人情報や認証情報をログやエラーメッセージに出力しない。
* テストデータには架空のURLやパスワードを使用し、実サービスを呼び出さない。
* 外部ネットワークアクセスは、ユーザー承認を得た場合のみ（デフォルトでは無効）。

---

## 8. エージェント向け補足

* 複数の `AGENTS.md` が存在する場合は、作業ディレクトリに最も近いものを参照（本リポジトリではトップレベルのみ）。
* 指示が矛盾する場合は、明示的なユーザー指示を優先し、不明点は確認する。
* 作業前後に `npm run type-check` `npm run lint` `npm run test` および `npm run build` の成功を確認。失敗した場合は原因と対処を報告。

---

## 9. ブランチ運用（GitHub Flow）

本プロジェクトは `main` を基軸とした **GitHub Flow** を採用しています。

* **main ブランチ**：常にリリース可能。直接コミットは禁止し、PR経由でのみ変更。
* **機能ブランチ（`feature/<topic>`）**：新機能・改善用。完了後に PR を作成。
* **ホットフィックスブランチ（`hotfix/<issue>`）**：緊急修正用。CI 通過後すぐにマージ。

### 運用ルール

* すべての作業は `main` から分岐。
* PR 作成時にはレビュー担当者を指定し、CI 通過後にのみマージ。
* マージ後はブランチを削除して問題ありません。

---

## 10. コミットメッセージ規約

コミットメッセージは **Conventional Commits** に準拠します。コメント部は **英語** で記述してください。

### フォーマット

```

type(scope?): description

```

* `type`: feat / fix / docs / style / refactor / test / chore
* `scope`: 任意。モジュール名やディレクトリ名など。
* `description`: 変更内容を英語で簡潔に記述。

### 本文

* WHY（変更理由）を英語1文で記載。
* HOW（ファイルごとの変更点）を英語で箇条書き。

```

* internal/data/data.go: Added error return when YAML parsing fails
* pkg/req/req.go: Strengthened HTTP timeout configuration

```

### 粒度

* 原則、1つの意味的変更につき1コミット。
* 自動生成コードは他の変更と混在させない。

### PR とコミット

* PR の説明欄には英語で **Motivation / Design / Tests / Risks** を記載。
* チームポリシーで明示されていない限り、レビュー後の squash は任意。

---

## 11. ドキュメント運用方針

* **トップレベルの README.md**：
  * 概要、利用方法、インストール手順を記載。
  * 開発手順やテスト方法も後半に記述。
  * 初心者でも導入できる明快な内容に保つ。

* **docs/**：
  * 詳細設計書や補足資料を必要に応じて追加。構造・ファイル名は追加時に定義。

* **運用ガイドライン**：
  * コード変更と同時にドキュメントも更新。変更不要な場合は PR に「No documentation changes」と明記。
  * サンプルコード・コマンド例の動作を確認。
  * 自動生成ドキュメントを追加する場合は、生成スクリプトも含める。

---

## 12. 依存関係管理方針

* 依存追加時は `npm install <module>` を使用し、`package.json` / `package-lock.json` を同期。
* 依存更新時は、対象モジュールと理由を PR 本文に明記。
* 外部依存の脆弱性は `npm audit` でチェックし、必要に応じて報告。

---

## 13. リリース手順

* バージョン管理は **SemVer** に従う。
* 新リリースは `git tag vX.Y.Z` でタグ付けし、`make release` の出力を確認。
* `CHANGELOG.md` を更新し、リリースノートに反映（自動生成ツールを使用した場合はそのスクリプトも含む）。

### 13.1 CHANGELOG.md 運用方針

* **セクション分類**：`[Keep a Changelog]` に準拠 — `Added / Changed / Fixed / Deprecated / Removed / Security`
* **言語**：英語
* **記述原則**：
  * 「ユーザーから見た変更点」を1文で説明し、実装詳細は必要な場合のみ。
  * **Breaking Changes** は強調し、移行手順を記載。
  * 可能な場合は PR / Issue 番号を付記（例：`(#123)`）。
* **ワークフロー**：
  1. 機能追加時、`Unreleased` セクションに追記。
  2. リリースPRでバージョン番号と日付を更新。
  3. タグ付け後、該当セクションをリリースノートに転記。
* **リンク推奨**：
  * ファイル末尾に比較リンクを追加。
* **補助ツール（任意）**：
  * `git-cliff` や `conventional-changelog` などで下書きを生成後、手動で整備。

---

## 14. PR テンプレート

PR 作成時には以下項目を含めること：

* **Motivation**（動機）：なぜこの変更が必要か  
* **Design**（設計）：どのように実装したか  
* **Tests**（テスト）：どのテストを実施したか  
* **Risks**（リスク）：懸念点・副作用など

テンプレート例：

```

### Motivation

...

### Design

...

### Tests

...

### Risks

...

```

---

## 15. チェックリスト

*
