# 社内レビュー管理システム - 要件定義

## 背景・課題

### 現状の課題
- 社内成果物（webthqui, sougoushinrimake等）のレビュー/チェックを**口頭で依頼**している
- 口頭依頼だと**進捗しない、放置されがち**
- 誰が何を確認したか、どこまで進んでいるか不明

### 解決したいこと
- レビュー依頼〜完了までをシステムで管理
- URLベースでプレビュー確認
- コメントのラリー（やり取り）ができる
- メール通知で確実に依頼を届ける

---

## システム概要

### システム名
**sougoushinricheck** - 社内レビュー管理システム

### 技術スタック
- **フロントエンド**: SvelteKit + TypeScript + Tailwind CSS
- **データベース**: Turso (LibSQL)
- **ホスティング**: Cloudflare Pages + Workers
- **メール**: Gmail IMAP連携（通知用）

---

## 機能要件

### 1. レビュー依頼管理

#### 1.1 レビュー依頼の作成
- 依頼タイトル
- 対象URL（プレビュー用）
- 成果物タイプ選択
  - Web/LP（webthqui等）
  - ブログ/プレスリリース（sougoushinrimake等）
  - デザインファイル（Figma URL等）
  - ドキュメント（Google Docs URL等）
  - その他
- 説明・依頼内容
- レビュワー選択（複数可）
- 期限設定

#### 1.2 レビュー依頼一覧
- ステータス別表示（依頼中/確認中/完了/差し戻し）
- フィルタ・検索機能
- 自分が依頼したもの / 自分に依頼されたもの切り替え

### 2. プレビュー・確認機能

#### 2.1 URLプレビュー
- iframeによるプレビュー表示（対応サイトの場合）
- 外部リンクとして開くオプション
- スクリーンショット保存（オプション）

#### 2.2 コメント機能
- スレッド形式のコメント
- コメントへの返信（ラリー形式）
- メンション機能（@ユーザー名）
- 添付ファイル（画像等）

#### 2.3 チェック・承認
- 「確認OK」「差し戻し」アクション
- チェック履歴の記録
- 全員確認完了で自動ステータス更新

### 3. ユーザー管理

#### 3.1 社内メンバー管理
- メンバー登録（名前、メールアドレス）
- ロール設定（管理者/一般）
- アクティブ/非アクティブ

#### 3.2 認証（ログイン機能）
- メールアドレス + パスワードでログイン
- パスワードはbcryptでハッシュ化保存
- セッションベース認証（Cookie）
- セッション有効期限: 24時間
- ログアウト機能
- 初回セットアップ時の管理者アカウント作成

### 4. メール通知

#### 4.1 通知タイミング
- レビュー依頼を受けた時
- コメントが追加された時
- 承認/差し戻しされた時
- リマインダー（期限前）

#### 4.2 Gmail IMAP連携
- 1つのGmailアカウントを使用
- IMAP経由でメール送信
- 送信元アドレスの設定

---

## データベース設計

### テーブル構成

```sql
-- ユーザー
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- admin/member
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- セッション
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- レビュー依頼
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  content_type TEXT NOT NULL, -- web/blog/design/document/other
  status TEXT DEFAULT 'pending', -- pending/in_review/approved/rejected
  requester_id TEXT NOT NULL,
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id)
);

-- レビュワー割り当て
CREATE TABLE review_assignees (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending/approved/rejected
  reviewed_at DATETIME,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- コメント
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT, -- 返信の場合
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- メール設定
CREATE TABLE email_settings (
  id TEXT PRIMARY KEY,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  email_address TEXT NOT NULL,
  app_password TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 通知履歴
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  review_id TEXT,
  type TEXT NOT NULL, -- review_request/comment/approval/reminder
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL
);
```

---

## 画面構成

### ページ一覧

| パス | 説明 | 認証 |
|------|------|------|
| / | ログインページ | 不要 |
| /setup | 初回セットアップ | 不要（ユーザー0人時のみ） |
| /dashboard | ダッシュボード（概要） | 必要 |
| /reviews | レビュー一覧 | 必要 |
| /reviews/new | 新規レビュー依頼 | 必要 |
| /reviews/[id] | レビュー詳細・コメント | 必要 |
| /members | メンバー管理 | 管理者 |
| /settings | 設定（メール等） | 管理者 |

### ダッシュボード表示項目
- 自分に依頼されたレビュー（未対応）
- 自分が依頼したレビュー（進行中）
- 最近のアクティビティ

---

## 実装計画

### Phase 1: 基盤構築
1. SvelteKitプロジェクト初期化
2. Tursoデータベース接続
3. 認証機能（ログイン/ログアウト）
4. 基本レイアウト

### Phase 2: コア機能
1. ユーザー管理
2. レビュー依頼CRUD
3. レビュワー割り当て
4. ステータス管理

### Phase 3: コメント機能
1. コメント投稿
2. 返信機能（スレッド）
3. メンション機能

### Phase 4: 通知機能
1. Gmail SMTP設定
2. メール送信
3. 通知履歴

### Phase 5: UI/UX改善
1. プレビュー機能
2. ダッシュボード最適化
3. レスポンシブ対応

---

## 検証方法

1. **開発サーバー起動**: `npm run dev`
2. **動作確認**:
   - ユーザー登録・ログイン
   - レビュー依頼作成
   - コメント追加
   - 承認/差し戻し
   - メール通知受信
3. **Cloudflareデプロイ**: `npm run build && wrangler pages deploy`

---

## 補足

### 既存プロジェクトとの関係
- **webthqui**: ストレスチェック分析システム → このシステムでレビュー依頼
- **sougoushinrimake**: MAツール（LP/ブログ/PR作成） → このシステムでレビュー依頼

### 運用想定
- **初期ユーザー数**: 2-5名（小規模チーム）
- **メール通知**: 既存Gmailアカウント使用（アプリパスワード設定済み）

### 将来の拡張可能性
- Slack連携
- 承認フローのカスタマイズ
- レポート機能

---

## プロジェクト・タスク管理機能（追加実装済み）

### 5. プロジェクト管理（Trello風）

#### 5.1 プロジェクトの作成・管理
- タイトル、説明、期限、優先度（高/中/低）、ステータス（未着手/進行中/完了/保留）
- カラー設定（カレンダー表示用）
- 担当者の割り当て（複数可）
- レビューとの紐付け（1つのプロジェクトに複数のレビュー）

#### 5.2 プロジェクト内タスク管理（Trello風カンバン）
- **ボードビュー**: 未着手/進行中/完了の3カラムでタスク管理
- **カレンダービュー**: プロジェクト内タスクを月間カレンダーで表示
- タスクの追加・編集・削除
- ステータス移動ボタンでワンクリック移動
- 期限設定と進捗率の自動計算

#### 5.3 プロジェクトとレビューの関連
- レビュー作成時にプロジェクトを紐付け可能
- プロジェクト詳細画面で関連レビューの一覧表示

### 6. カレンダー機能（全体ビュー）

#### 6.1 表示モード
- **月表示**: Googleカレンダー風の月間ビュー
- **週表示**: 週間タイムライン
- **リスト表示**: タスク・プロジェクトのリスト
- **ガントチャート**: プロジェクト進捗の横軸表示

#### 6.2 機能
- プロジェクトとレビューの期限を統合表示
- フィルタ（プロジェクトのみ/レビューのみ/すべて）
- 月・週の移動ナビゲーション
- 今日へのジャンプ

### 7. マジックリンク対応

#### 7.1 カレンダー用マジックリンク
- `/calendar/[token]` でログイン不要アクセス
- ユーザーごとにパーソナライズされたビュー
- 7日間有効

---

## 追加データベース設計

```sql
-- プロジェクト（旧: ゴール）
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME NOT NULL,
  priority TEXT DEFAULT 'medium', -- high/medium/low
  status TEXT DEFAULT 'pending', -- pending/in_progress/completed/on_hold
  color TEXT DEFAULT '#3b82f6',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- プロジェクト担当者
CREATE TABLE goal_assignees (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(goal_id, user_id)
);

-- レビューとプロジェクトの紐付け
CREATE TABLE review_goals (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(review_id, goal_id)
);

-- プロジェクト内タスク（Trello風カンバン用）
CREATE TABLE goal_tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME,
  status TEXT DEFAULT 'pending', -- pending/in_progress/completed
  sort_order INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- チェック項目
CREATE TABLE check_items (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  goal_id TEXT,
  content TEXT NOT NULL,
  purpose TEXT,
  due_date DATETIME,
  priority TEXT DEFAULT 'medium',
  is_checked INTEGER DEFAULT 0,
  checked_by TEXT,
  checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  FOREIGN KEY (checked_by) REFERENCES users(id)
);

-- magic_links テーブルに type カラム追加
ALTER TABLE magic_links ADD COLUMN type TEXT DEFAULT 'review';
-- type: 'review' | 'calendar' | 'goal'
```

---

## 追加画面構成

| パス | 説明 | 認証 |
|------|------|------|
| /calendar | カレンダー・タスク管理（全体ビュー） | 必要 |
| /calendar/[token] | マジックリンク認証カレンダー | 不要（トークン認証） |
| /goals | プロジェクト一覧 | 必要 |
| /goals/new | プロジェクト作成 | 必要 |
| /goals/[id] | プロジェクト詳細（Trello風ボード＆カレンダー） | 必要 |

---

## 主要ファイル構成

```
src/routes/
├── calendar/
│   ├── +page.svelte              # 全体カレンダーUI
│   ├── +page.server.ts           # カレンダーデータ取得
│   └── [token]/
│       ├── +page.svelte          # マジックリンクカレンダー
│       └── +page.server.ts
├── goals/
│   ├── +page.svelte              # プロジェクト一覧
│   ├── +page.server.ts
│   ├── new/
│   │   ├── +page.svelte          # プロジェクト作成
│   │   └── +page.server.ts
│   └── [id]/
│       ├── +page.svelte          # プロジェクト詳細（ボード＆カレンダー）
│       └── +page.server.ts       # タスクCRUD API
└── ...

src/lib/components/
├── CalendarMonth.svelte          # 月表示コンポーネント
├── CalendarWeek.svelte           # 週表示コンポーネント
├── CalendarList.svelte           # リスト表示コンポーネント
├── CalendarGantt.svelte          # ガントチャートコンポーネント
├── GoalBlock.svelte              # プロジェクトブロックコンポーネント
└── AppLayout.svelte              # サイドバー（カレンダー・プロジェクト追加済み）

scripts/
├── add_goals.js                  # プロジェクト関連テーブル マイグレーション
└── add_goal_tasks.js             # タスクテーブル マイグレーション
```

---

## マイグレーション実行

プロジェクト・タスク管理機能を有効にするには、以下のマイグレーションを実行：

```bash
node scripts/add_goals.js
node scripts/add_goal_tasks.js
```
