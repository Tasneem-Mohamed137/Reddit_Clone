# Database schema (ER diagram)

```mermaid
erDiagram
  USERS ||--o{ POSTS : writes
  USERS ||--o{ COMMENTS : writes
  USERS ||--o{ VOTES : casts
  USERS ||--o{ COMMUNITY_MEMBERS : joins
  USERS ||--o{ FOLLOWS : "follows (follower)"
  USERS ||--o{ FOLLOWS : "is followed (followee)"
  USERS ||--o{ CHAT_MEMBERS : takes_part
  USERS ||--o{ MESSAGES : sends
  COMMUNITIES ||--o{ COMMUNITY_MEMBERS : has
  COMMUNITIES ||--o{ POSTS : contains
  POSTS ||--o{ COMMENTS : has
  POSTS ||--o{ VOTES : receives
  COMMENTS ||--o{ COMMENTS : "replies to"
  CHATS ||--o{ CHAT_MEMBERS : has
  CHATS ||--o{ MESSAGES : contains

  USERS {
    string id PK
    string email UK
    string username UK "case-insensitive"
    string password_hash
    string display_name
    string bio
    string avatar_url
    datetime created_at
  }
  COMMUNITIES {
    string id PK
    string name UK "case-insensitive"
    string description
    string icon_url
    string banner_url
    string creator_id FK
    int member_count
    datetime created_at
  }
  COMMUNITY_MEMBERS {
    string community_id FK
    string user_id FK
    string role "member | moderator"
    datetime joined_at
  }
  POSTS {
    string id PK
    string community_id FK
    string author_id FK
    string type "text | image | link (derived)"
    string title
    string body "markdown"
    string_array media_urls
    string link_url
    string_array tags "nsfw | spoiler"
    int score "only changed by atomic delta"
    int comment_count
    datetime created_at
    datetime updated_at
  }
  COMMENTS {
    string id PK
    string post_id FK
    string parent_id FK "null = top level"
    string author_id FK "null once deleted"
    string body "markdown"
    boolean deleted
    datetime created_at
    datetime edited_at
  }
  VOTES {
    string user_id FK
    string post_id FK
    int value "+1 or -1"
  }
  FOLLOWS {
    string follower_id FK
    string followee_id FK
    datetime created_at
  }
  CHATS {
    string id PK
    string creator_id FK
    datetime created_at
    datetime last_message_at
  }
  CHAT_MEMBERS {
    string chat_id FK
    string user_id FK
    datetime read_at
  }
  MESSAGES {
    string id PK
    string chat_id FK
    string sender_id FK
    string body
    datetime created_at
  }
```

## Relations
- **users - posts / comments**: one user writes many posts and comments. A deleted comment that still has replies keeps its row (`deleted = true`, `author_id = null`, body `[deleted]`) so the thread stays intact.
- **communities - community_members - users**: many-to-many. `role = moderator` is given to the creator; moderators can remove any post or comment of their community.
- **comments - comments**: self relation through `parent_id`, so replies nest without a depth limit.
- **votes**: one row per (user, post). The post `score` is changed only by the delta of a vote, never recomputed in application code.
- **follows**: directed edge follower -> followee. "People you may know" and the Following feed are built from it.
- **chats - chat_members - users**: a chat has two or more members (more than two = group chat). `read_at` per member gives the unread count. In the mock database the members are stored as an array inside the chat; in Mongo/SQL use this table.

## Indexes
| Index | Why |
|---|---|
| `users.email` UNIQUE, `users.username` UNIQUE (case-insensitive collation) | no duplicate accounts, fast login and username check |
| `communities.name` UNIQUE (case-insensitive) | `r/name` URLs are unique |
| `community_members (community_id, user_id)` UNIQUE | joining twice is a no-op; fast "is member" check |
| `votes (user_id, post_id)` UNIQUE | **at most one vote per user per post**, even when requests race |
| `posts (community_id, created_at DESC, id DESC)` | community feed, New sort, keyset pagination |
| `posts (score DESC, id DESC)` | Top sort |
| `posts (author_id, created_at DESC)` | profile Posts tab, Following feed |
| `comments (post_id, parent_id)` | load a thread and its replies |
| `follows (follower_id, followee_id)` UNIQUE, `follows (followee_id)` | follow idempotency, followers list |
| `chat_members (chat_id, user_id)` UNIQUE, `chat_members (user_id)` | my chats |
| `messages (chat_id, created_at DESC)` | load the latest messages, page back in time |