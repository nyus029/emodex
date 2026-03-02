# Emodex: 「 EMOI × INDEX 」複利で増やすエモ投資 
<img width="1095" height="622" alt="スクリーンショット 2026-02-23 13 31 19" src="https://github.com/user-attachments/assets/374d0ab9-7cc1-420c-99fb-77e6a5e33a1c" />

## 1. システム全体アーキテクチャ

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["Browser / PWA"]
        SW["Service Worker<br/>push-sw.js"]
        Auth0SDK["Auth0 SDK<br/>useUser()"]
        AgentCtx["AgentComment<br/>Context + localStorage"]
    end

    subgraph AppRouter["Next.js App Router (app/)"]
        Pages["Pages<br/>/ /album /insight /invests<br/>/dividend /portfolio /admin"]
    end

    subgraph Features["Features Layer (features/)"]
        HomeF["HomeFeature<br/>気分入力 + Movers"]
        InvestF["InvestsFeature<br/>アルバム詳細"]
        InsightF["InsightFeature<br/>ポートフォリオ概要"]
        DividendF["DividendFeature<br/>配当一覧・詳細"]
        AdminF["AdminFeature<br/>管理者画面"]
        GraphF["GraphFeature<br/>チャート表示"]
    end

    subgraph Components["Components Layer (components/)"]
        MoodUI["UnifiedMoodForm<br/>EmotionTag / TagInput"]
        AlbumUI["AlbumMovers<br/>AlbumSelector / PhotoPicker"]
        ChartUI["ExponentialChart<br/>EmoChart"]
        DivUI["DividendList<br/>DividendDetail"]
        AuthUI["LoginButton<br/>LogoutButton / Profile"]
        LayoutUI["Header / Footer<br/>LayoutShell"]
    end

    subgraph API["API Routes (app/api/)"]
        direction LR
        APIMood["/api/v1/mood/*<br/>sentence / suggested-words<br/>suggested-albums / cooldown"]
        APIAlbum["/api/v1/albums/*<br/>CRUD / chart / insight<br/>movers / photo-storages"]
        APISentence["/api/v1/sentences/*<br/>generate / stream"]
        APIDividend["/api/v1/dividend/*<br/>execute / approvals"]
        APIGroup["/api/v1/groups/*<br/>CRUD / members"]
        APIChat["/api/chat/stream"]
        APIBlob["/api/blob/*<br/>upload / delete"]
        APIAdmin["/api/admin/*<br/>overview / emo"]
        APICron["/api/cron/*<br/>emo-snapshots<br/>expired-photos"]
    end

    subgraph BizLogic["Business Logic (lib/)"]
        AuthLib["auth0.ts<br/>Auth0Client / onCallback"]
        APIUtils["api-utils.ts<br/>requireAuth() / Zod"]
        EmoLib["emo-value.ts<br/>emo-boost.ts<br/>emo-shock.ts<br/>emo-snapshots.ts"]
        DivLib["dividend-execution.ts<br/>dividend-approval.ts<br/>dividend-notification.ts"]
        AlbumLib["albums.ts<br/>album-access.ts<br/>photo-storage.ts"]
        MoodLib["mood-scoring.ts<br/>mood-cooldown.ts"]
        NotifLib["server-notification.ts"]
    end

    subgraph Mastra["Mastra AI Layer (mastra/)"]
        ChatAgent["chatAgent<br/>OpenAI Codex"]
        SentenceAgent["sentenceAgent<br/>Claude Haiku 4.5"]
        WeatherAgent["weatherAgent<br/>GPT-4o"]
        Tools["Tools<br/>sentenceTool / moodTools<br/>suggestAlbumsTool<br/>weatherTool"]
        Workflows["weatherWorkflow<br/>fetch → plan"]
        Prompts["Prompts<br/>MOOD_SENTENCE<br/>SENTENCE_FROM_WORDS<br/>EMO_BOOST_COMMENT"]
    end

    subgraph DataLayer["Data Layer"]
        Prisma["Prisma 7<br/>@prisma/adapter-mariadb"]
        MySQL[("MySQL 8.4<br/>Docker :3307")]
    end

    subgraph External["External Services"]
        OpenAI["OpenAI<br/>GPT-5 Codex / GPT-4o"]
        Anthropic["Anthropic<br/>Claude Haiku 4.5"]
        Auth0Ext["Auth0<br/>OAuth2 / OIDC"]
        VBlob["Vercel Blob<br/>Image CDN"]
        OpenMeteo["Open-Meteo<br/>Weather API"]
        VCron["Vercel Cron<br/>Daily 00:00 / 01:00"]
        Turso["Turso / LibSQL<br/>Mastra Storage"]
    end

    Browser --> Pages
    SW -.- Browser
    Auth0SDK -.- Browser
    AgentCtx -.- Browser

    Pages --> HomeF & InvestF & InsightF & DividendF & AdminF & GraphF
    HomeF --> MoodUI & AlbumUI
    InvestF --> AlbumUI & ChartUI
    InsightF --> ChartUI
    DividendF --> DivUI
    GraphF --> ChartUI

    HomeF -- "fetch/stream" --> APIMood & APIAlbum & APISentence
    InvestF --> APIAlbum & APIBlob
    InsightF --> APIAlbum
    DividendF --> APIDividend
    AdminF --> APIAdmin

    APIMood --> MoodLib & EmoLib
    APIAlbum --> AlbumLib & EmoLib
    APIDividend --> DivLib & NotifLib
    APISentence --> Mastra
    APIChat --> ChatAgent
    APIBlob --> VBlob
    APICron --> EmoLib & AlbumLib

    APIMood --> Tools
    ChatAgent --> OpenAI
    SentenceAgent --> Anthropic
    WeatherAgent --> OpenAI
    Tools --> OpenMeteo

    EmoLib --> Prisma
    DivLib --> Prisma
    AlbumLib --> Prisma
    MoodLib --> Prisma
    Prisma --> MySQL

    AuthLib --> Auth0Ext
    VCron --> APICron

    style Client fill:#f5f5f5,stroke:#999
    style AppRouter fill:#e8f5e9,stroke:#2e7d32
    style Features fill:#e3f2fd,stroke:#1565c0
    style Components fill:#fff3e0,stroke:#e65100
    style API fill:#fce4ec,stroke:#c62828
    style BizLogic fill:#ede7f6,stroke:#4527a0
    style Mastra fill:#f3e5f5,stroke:#6a1b9a
    style DataLayer fill:#fff9c4,stroke:#f57f17
    style External fill:#e0f2f1,stroke:#00695c
```

## 2. コアドメインフロー: Emo値の計算と変動

```mermaid
graph LR
    subgraph PhotoStorage["PhotoStorage (写真保管庫)"]
        Photos["photoCount<br/>写真枚数"]
        BaseEmo["baseEmoPerPhoto<br/>基礎Emo値 (初期:100)"]
        StartDate["compoundStartDate<br/>複利開始日"]
        Active["isCompoundActive<br/>複利ON/OFF"]
    end

    subgraph Compounding["複利計算"]
        Formula["photoCount × baseEmo<br/>× (1 + 0.63%)^経過日数<br/>年率10倍成長"]
    end

    subgraph Boost["Emo Boost (当日のみ)"]
        BoostCalc["baseEmo × (1 + Σ relevanceScore × 0.5)<br/>気分記録で推薦されたアルバムに適用"]
    end

    subgraph Shock["Emo Shock (7日間で回復)"]
        ShockCalc["boostedEmo × Π(1 - shockRate × 残回復率)<br/>不適切アルバムへの減衰"]
    end

    subgraph FinalValue["最終Emo値"]
        Result["Album Emo = Σ PhotoStorage Emo<br/>(複利 × Boost × Shock)"]
    end

    Photos & BaseEmo & StartDate & Active --> Formula
    Formula --> Boost
    Boost --> Shock
    Shock --> Result

    style PhotoStorage fill:#fff9c4,stroke:#f57f17
    style Compounding fill:#e8f5e9,stroke:#2e7d32
    style Boost fill:#e3f2fd,stroke:#1565c0
    style Shock fill:#fce4ec,stroke:#c62828
    style FinalValue fill:#f3e5f5,stroke:#6a1b9a
```

## 3. 気分記録パイプライン (Mood Recording)

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Home as HomeFeature
    participant MoodAPI as /api/v1/mood
    participant SentAPI as /api/v1/sentences
    participant AI as Mastra AI<br/>(sentenceAgent)
    participant AlbumAI as suggestAlbums<br/>Tool (chatAgent)
    participant DB as MySQL

    User->>Home: 感情ワード選択<br/>["悲しい", "安心"]
    Home->>MoodAPI: POST /mood/suggested-words
    MoodAPI->>DB: 過去の傾向取得
    MoodAPI-->>Home: suggestedWords[]

    User->>Home: ワード確定 → 文章生成
    Home->>SentAPI: POST /sentences/stream
    SentAPI->>AI: moodSentenceFromWordsTool
    AI-->>Home: 🔄 ストリーミング文章

    Home->>MoodAPI: POST /mood/sentence
    Note over MoodAPI: Cooldown チェック (1時間)
    MoodAPI->>AI: moodSentenceFromWordsTool
    MoodAPI->>AI: emotionRecommendationTool
    MoodAPI->>DB: MoodRecord 作成
    MoodAPI-->>Home: { sentence, recommendation }

    Home->>MoodAPI: POST /mood/suggested-albums
    MoodAPI->>DB: ユーザーのアルバム一覧取得
    MoodAPI->>AlbumAI: suggestAlbumsByEmotionTool
    Note over AlbumAI: 感情×アルバム分析<br/>suggested[] + inappropriate[]
    AlbumAI-->>MoodAPI: 推薦 & 不適切リスト

    MoodAPI->>DB: MoodRecord更新<br/>boostedAlbumIds / Scores
    MoodAPI->>DB: EmoShockEvent作成<br/>(不適切アルバム)
    MoodAPI-->>Home: { suggestedAlbums, shockedAlbums }

    Home->>MoodAPI: POST /mood/suggested-albums/stream
    MoodAPI->>AI: EMO_BOOST_COMMENT生成
    AI-->>Home: 🔄 ストリーミングコメント
```

## 4. 配当フロー (Dividend)

```mermaid
flowchart TD
    Start([配当リクエスト]) --> TypeCheck{アルバム種別?}

    TypeCheck -- "PRIVATE" --> ActionCheck{アクション?}
    TypeCheck -- "SHARED" --> SharedFlow

    ActionCheck -- "REINVEST<br/>再投資" --> Reinvest
    ActionCheck -- "RECEIVE<br/>受取" --> ReceivePrivate

    subgraph Reinvest["再投資 (即時実行)"]
        R1["baseEmoPerPhoto を2倍"]
        R2["compoundStartDate リセット"]
        R3["isCompoundActive = true 維持"]
        R1 --> R2 --> R3
    end

    subgraph ReceivePrivate["受取 (PRIVATE・即時)"]
        RP1["isCompoundActive = false"]
        RP2["DividendEvent 作成"]
        RP3["通知キュー登録"]
        RP1 --> RP2 --> RP3
    end

    subgraph SharedFlow["SHARED アルバム承認フロー"]
        S1["DividendApprovalRequest 作成<br/>status: PENDING / 期限: 7日"]
        S2["全メンバーに DividendApproval 作成<br/>依頼者は自動承認"]
        S3{全員承認?}
        S4["メンバーが承認<br/>POST /approvals/:id"]
        S5{期限切れ?}
        S6["status → EXPIRED"]
        S7["配当実行<br/>isCompoundActive = false"]
        S8["通知送信"]

        S1 --> S2 --> S3
        S3 -- "No" --> S4 --> S3
        S3 -- "Yes" --> S7 --> S8
        S3 -- "待機中" --> S5
        S5 -- "Yes" --> S6
        S5 -- "No" --> S4
    end

    Reinvest --> DivEvent["DividendEvent 記録"]
    ReceivePrivate --> Cleanup
    SharedFlow --> Cleanup

    subgraph Cleanup["写真クリーンアップ (Cron 7日後)"]
        C1["RECEIVE済 & 7日経過の<br/>PhotoStorage を検索"]
        C2["Vercel Blob から画像削除<br/>(200件ずつバッチ)"]
        C3["blobUrl クリア"]
        C1 --> C2 --> C3
    end

    style Reinvest fill:#e8f5e9,stroke:#2e7d32
    style ReceivePrivate fill:#e3f2fd,stroke:#1565c0
    style SharedFlow fill:#fff3e0,stroke:#e65100
    style Cleanup fill:#fce4ec,stroke:#c62828
```

## 5. 日次バッチ処理 (Cron Jobs)

```mermaid
flowchart LR
    subgraph Trigger["Vercel Cron"]
        Cron00["毎日 00:00 UTC"]
        Cron01["毎日 01:00 UTC"]
    end

    subgraph SnapJob["Emo Snapshots Job"]
        S1["全 PhotoStorage 取得<br/>(isCompoundActive=true)"]
        S2["各Storageの<br/>Emo値を計算"]
        S3["EmoSnapshot<br/>UPSERT<br/>(storageId, date)"]
    end

    subgraph ExpireJob["Expired Photos Job"]
        E1["RECEIVE済 DividendEvent<br/>(7日以上前) を検索"]
        E2["対象 PhotoStoragePhoto<br/>(blobUrl あり) を取得"]
        E3["Vercel Blob<br/>バッチ削除"]
        E4["blobUrl クリア"]
    end

    subgraph Usage["利用先"]
        Chart["アルバム チャートデータ<br/>/albums/:id/chart"]
        Movers["Movers (上昇・下落)<br/>/albums/movers"]
        Insight["ポートフォリオ概要<br/>/albums/insight"]
    end

    Cron00 --> S1 --> S2 --> S3
    Cron01 --> E1 --> E2 --> E3 --> E4

    S3 --> Chart & Movers & Insight

    style Trigger fill:#e0f2f1,stroke:#00695c
    style SnapJob fill:#fff9c4,stroke:#f57f17
    style ExpireJob fill:#fce4ec,stroke:#c62828
    style Usage fill:#e3f2fd,stroke:#1565c0
```

## 6. 認証フロー (Auth0)

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant App as Next.js App
    participant Auth0 as Auth0
    participant Callback as onCallback Hook
    participant DB as MySQL

    User->>App: /login アクセス
    App->>Auth0: OAuth2 リダイレクト
    Auth0-->>User: ログイン画面
    User->>Auth0: Google認証
    Auth0-->>App: コールバック (token)

    App->>Callback: onCallback(session)
    Callback->>DB: User UPSERT<br/>(email をキーに)
    Note over Callback,DB: name, picture を<br/>Auth0 から同期
    Callback-->>App: セッション確立

    Note over App: 以降の API リクエスト
    App->>App: requireAuth()<br/>→ auth0.getSession()
    App->>DB: userId で認可チェック
```

## 7. データモデル関連図

```mermaid
erDiagram
    User ||--o{ Album : "owns"
    User ||--o{ Membership : "belongs to"
    User ||--o{ MoodRecord : "records"
    User ||--o{ PushSubscription : "subscribes"
    User ||--o{ SystemAdministrator : "is admin"

    Group ||--o{ Membership : "has"
    Group ||--o{ Album : "shared via"

    Album ||--o{ PhotoStorage : "contains"
    Album ||--o{ EmoShockEvent : "receives shock"
    Album ||--o{ DividendApprovalRequest : "requests"

    PhotoStorage ||--o{ PhotoStoragePhoto : "stores"
    PhotoStorage ||--o{ EmoSnapshot : "daily snapshot"
    PhotoStorage ||--o{ DividendEvent : "dividend on"

    MoodRecord ||--o{ EmoShockEvent : "triggers"

    DividendApprovalRequest ||--o{ DividendApproval : "needs"
    DividendApprovalRequest ||--o| DividendEvent : "executes"
    DividendEvent ||--o{ NotificationDelivery : "notifies"

    User {
        int id PK
        string email UK
        string name
        string picture
    }

    Album {
        int id PK
        int userId FK
        string name
        enum albumType "PRIVATE | SHARED"
        int groupId FK
    }

    PhotoStorage {
        int id PK
        int albumId FK
        int photoCount
        float baseEmoPerPhoto
        datetime compoundStartDate
        boolean isCompoundActive
    }

    MoodRecord {
        int id PK
        int userId FK
        string sentence
        json words
        json boostedAlbumIds
        json boostedAlbumScores
    }

    EmoSnapshot {
        int id PK
        int photoStorageId FK
        date snapshotDate
        float emoValue
    }

    EmoShockEvent {
        int id PK
        int albumId FK
        int moodRecordId FK
        float shockRate
        datetime shockedAt
        int recoveryDays
    }

    DividendEvent {
        int id PK
        int albumId FK
        int photoStorageId FK
        enum action "REINVEST | RECEIVE"
        float emoValueAtEvent
    }

    DividendApprovalRequest {
        int id PK
        int albumId FK
        enum status "PENDING | APPROVED | EXPIRED"
        datetime expiresAt
    }

    NotificationDelivery {
        int id PK
        int userId FK
        enum status "PENDING | SENT | FAILED"
        json payload
        int attemptCount
    }
```

## 8. Emo値の時系列変動

```mermaid
graph TD
    subgraph Timeline["Emo値の1日の変動要因"]
        direction LR
        Morning["朝<br/>複利で基礎値成長<br/>📈 毎日+0.63%"]
        MoodTime["気分記録時<br/>Boost適用 (当日限り)<br/>📊 最大+50%/推薦"]
        ShockTime["Shock発生<br/>不適切判定で減衰<br/>📉 最大-50%"]
        MidDay["日中<br/>Boost + Shock 併存<br/>リアルタイム計算"]
        Midnight["深夜 00:00<br/>EmoSnapshot保存<br/>Boost リセット"]
    end

    Morning --> MoodTime --> ShockTime --> MidDay --> Midnight
    Midnight -->|"翌日"| Morning

    subgraph Recovery["Shock回復 (7日間)"]
        D0["Day 0: 100% Impact"]
        D1["Day 1: ~86% Impact"]
        D3["Day 3: ~57% Impact"]
        D5["Day 5: ~29% Impact"]
        D7["Day 7: 0% 完全回復"]
        D0 --> D1 --> D3 --> D5 --> D7
    end

    style Timeline fill:#f5f5f5,stroke:#999
    style Recovery fill:#fff3e0,stroke:#e65100
```

