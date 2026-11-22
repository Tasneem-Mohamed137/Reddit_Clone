const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const err = (description) => ({ description, content: json(ref('Error')) });
const ok = (description, schema) => ({ description, content: json(schema) });
const obj = (properties) => ({ type: 'object', properties });
const AUTH = [{ cookieAuth: [] }];
const pathParam = (name, description) => ({ name, in: 'path', required: true, description, schema: { type: 'string' } });
const queryParam = (name, schema, description) => ({ name, in: 'query', required: false, description, schema });
const reqBody = (example) => ({ required: true, content: { 'application/json': { example } } });

const E = {
  validation: err('VALIDATION_ERROR'),
  unauthorized: err('UNAUTHORIZED'),
  forbidden: err('FORBIDDEN'),
  notFound: err('NOT_FOUND'),
  conflict: err('CONFLICT'),
  rate: err('RATE_LIMITED'),
};

const FEED_PARAMS = [
  queryParam('sort', { type: 'string', enum: ['best', 'hot', 'new', 'top'], default: 'best' }, 'best = hot'),
  queryParam('range', { type: 'string', enum: ['hour', 'day', 'week', 'month', 'year', 'all'], default: 'all' }, 'Time filter, only used with sort=top'),
  queryParam('cursor', { type: 'string' }, 'nextCursor returned by the previous page'),
  queryParam('limit', { type: 'integer', default: 10, maximum: 50 }, 'Page size'),
];

const userOut = (description) => ok(description, obj({ user: ref('User') }));
const postOut = (description) => ok(description, obj({ post: ref('Post') }));
const commentOut = (description) => ok(description, obj({ comment: ref('Comment') }));
const communityOut = (description) => ok(description, obj({ community: ref('Community') }));
const postPage = (description) => ok(description, ref('PostPage'));

const personSchema = obj({
  id: { type: 'string' },
  username: { type: 'string' },
  displayName: { type: 'string' },
  bio: { type: 'string' },
  avatarUrl: { type: 'string', nullable: true },
});
const suggestionSchema = {
  allOf: [personSchema, obj({ mutualFollows: { type: 'integer' }, sharedCommunities: { type: 'integer' } })],
};
const messageSchema = obj({
  id: { type: 'string' },
  chatId: { type: 'string' },
  senderId: { type: 'string' },
  body: { type: 'string', maxLength: 2000 },
  createdAt: { type: 'string', format: 'date-time' },
});
const chatSchema = obj({
  id: { type: 'string' },
  participants: { type: 'array', items: personSchema, description: 'Everyone in the chat, including me' },
  isGroup: { type: 'boolean' },
  lastMessage: { ...messageSchema, nullable: true },
  unreadCount: { type: 'integer' },
  updatedAt: { type: 'string', format: 'date-time' },
});
const followState = obj({ isFollowing: { type: 'boolean' }, followerCount: { type: 'integer' } });
const people = (description) => ok(description, obj({ items: { type: 'array', items: personSchema } }));

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'Reddit Clone API', version: '1.0.0', description: 'Course project REST API. Auth uses an httpOnly cookie (access_token).' },
  servers: [{ url: 'http://localhost:4000/api/v1' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' } },
    schemas: {
      Error: obj({ error: obj({ code: { type: 'string', example: 'VALIDATION_ERROR' }, message: { type: 'string' } }) }),
      User: obj({
        id: { type: 'string' },
        username: { type: 'string', example: 'tasneem' },
        displayName: { type: 'string' },
        bio: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        karma: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' },
        email: { type: 'string', description: 'Only returned for the signed-in user' },
      }),
      Community: obj({
        id: { type: 'string' },
        name: { type: 'string', example: 'programming' },
        description: { type: 'string' },
        iconUrl: { type: 'string', nullable: true },
        bannerUrl: { type: 'string', nullable: true },
        memberCount: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' },
        moderators: { type: 'array', items: ref('User'), description: 'Only on GET /communities/{name}' },
        isMember: { type: 'boolean', description: 'Only on GET /communities/{name}' },
        isModerator: { type: 'boolean', description: 'Only on GET /communities/{name}' },
      }),
      Post: obj({
        id: { type: 'string' },
        type: { type: 'string', enum: ['text', 'image', 'link'] },
        title: { type: 'string', maxLength: 300 },
        body: { type: 'string' },
        mediaUrls: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string', enum: ['nsfw', 'spoiler'] } },       
        linkUrl: { type: 'string', nullable: true },
        score: { type: 'integer' },
        commentCount: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' },
        edited: { type: 'boolean' },
        community: obj({ id: { type: 'string' }, name: { type: 'string' }, iconUrl: { type: 'string', nullable: true } }),
        author: obj({ username: { type: 'string' }, displayName: { type: 'string' }, avatarUrl: { type: 'string', nullable: true } }),
        userVote: { type: 'integer', enum: [-1, 0, 1], description: 'The signed-in user\'s vote (0 when logged out)' },
        isJoined: { type: 'boolean' },
      }),
      PostPage: obj({ items: { type: 'array', items: ref('Post') }, nextCursor: { type: 'string', nullable: true } }),
      Comment: obj({
        id: { type: 'string' },
        postId: { type: 'string' },
        parentId: { type: 'string', nullable: true },
        body: { type: 'string' },
        deleted: { type: 'boolean' },
        edited: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        author: { type: 'object', nullable: true, properties: { username: { type: 'string' }, displayName: { type: 'string' }, avatarUrl: { type: 'string', nullable: true } } },
      }),
      VoteResult: obj({ score: { type: 'integer', example: 12 }, userVote: { type: 'integer', enum: [-1, 0, 1] } }),
    },
  },
  paths: {
    '/health': { get: { tags: ['System'], summary: 'Health check', responses: { 200: { description: 'OK' } } } },

    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create an account and sign in',
        requestBody: reqBody({ email: 'new@user.com', username: 'new_user', password: 'Password123!' }),
        responses: { 201: userOut('Created. Sets the access_token cookie.'), 400: E.validation, 409: E.conflict },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Sign in with email or username',
        requestBody: reqBody({ identifier: 'tasneem', password: 'Password123!' }),
        responses: { 200: userOut('OK. Sets the access_token cookie.'), 400: E.validation, 401: err('INVALID_CREDENTIALS') },
      },
    },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Clear the auth cookie', responses: { 204: { description: 'Signed out' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: AUTH, responses: { 200: userOut('OK'), 401: E.unauthorized } } },
    '/auth/username-available': {
      get: {
        tags: ['Auth'], summary: 'Live username availability check',
        parameters: [{ name: 'username', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { example: { available: true } } } }, 400: E.validation },
      },
    },

    '/users/me': {
      patch: {
        tags: ['Users'], summary: 'Edit my profile', security: AUTH,
        requestBody: reqBody({ displayName: 'Tasneem', bio: 'CS student', avatarUrl: 'https://picsum.photos/200' }),
        responses: { 200: userOut('Updated'), 400: E.validation, 401: E.unauthorized },
      },
    },
    '/users/me/communities': {
      get: {
        tags: ['Users'], summary: 'Communities I joined', security: AUTH,
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: ref('Community') } })), 401: E.unauthorized },
      },
    },
    '/users/{username}': {
      get: {
        tags: ['Users'], summary: 'Public profile (avatar, bio, karma, cake day)',
        parameters: [pathParam('username')], responses: { 200: userOut('OK'), 404: E.notFound },
      },
    },
    '/users/{username}/posts': {
      get: {
        tags: ['Users'], summary: 'Posts by a user (cursor pagination)',
        parameters: [pathParam('username'), ...FEED_PARAMS], responses: { 200: postPage('OK'), 404: E.notFound },
      },
    },
    '/users/{username}/comments': {
      get: {
        tags: ['Users'], summary: 'Comments by a user',
        parameters: [pathParam('username')], responses: { 200: { description: 'OK' }, 404: E.notFound },
      },
    },

    '/communities': {
      get: {
        tags: ['Communities'], summary: 'List / popular communities',
        parameters: [queryParam('limit', { type: 'integer', default: 10, maximum: 50 })],
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: ref('Community') } })) },
      },
      post: {
        tags: ['Communities'], summary: 'Create a community (creator becomes moderator)', security: AUTH,
        requestBody: reqBody({ name: 'webdev', description: 'All about web development', iconUrl: 'https://picsum.photos/100', bannerUrl: 'https://picsum.photos/1200/200' }),
        responses: { 201: communityOut('Created'), 400: E.validation, 401: E.unauthorized, 409: E.conflict },
      },
    },
    '/communities/{name}': {
      get: {
        tags: ['Communities'], summary: 'Community page data (members, moderators, isMember)',
        parameters: [pathParam('name')], responses: { 200: communityOut('OK'), 404: E.notFound },
      },
    },
    '/communities/{name}/membership': {
      post: {
        tags: ['Communities'], summary: 'Join (idempotent)', security: AUTH, parameters: [pathParam('name')],
        responses: { 200: communityOut('Joined'), 401: E.unauthorized, 404: E.notFound },
      },
      delete: {
        tags: ['Communities'], summary: 'Leave (moderators cannot leave)', security: AUTH, parameters: [pathParam('name')],
        responses: { 200: communityOut('Left'), 400: err('MODERATOR_CANNOT_LEAVE'), 401: E.unauthorized, 404: E.notFound },
      },
    },
    '/communities/{name}/posts': {
      get: {
        tags: ['Posts'], summary: 'Posts of a community (cursor pagination, sorting)',
        parameters: [pathParam('name'), ...FEED_PARAMS], responses: { 200: postPage('OK'), 404: E.notFound },
      },
      post: {
        tags: ['Posts'], summary: 'Create a post: title plus any mix of text (markdown), media and a link. The type is derived.', security: AUTH, parameters: [pathParam('name')],
        requestBody: reqBody({ title: 'My desk', body: 'Check **this** out', mediaUrls: ['/uploads/3f2c9a1e-7b1d-4c55-9a52-2a0f5d1c1e11.png'], linkUrl: 'https://example.com', tags: ['spoiler'] }),
        responses: { 201: postOut('Created'), 400: E.validation, 401: E.unauthorized, 404: E.notFound },
      },
    },

    '/posts': {
      get: { tags: ['Feed'], summary: 'Popular posts', parameters: FEED_PARAMS, responses: { 200: postPage('OK') } },
    },
    '/feed': {
      get: {
        tags: ['Feed'], summary: 'Posts from joined communities (Popular when logged out or nothing joined)',
        parameters: FEED_PARAMS, responses: { 200: postPage('OK') },
      },
    },
    '/posts/{id}': {
      get: { tags: ['Posts'], summary: 'Get a post', parameters: [pathParam('id')], responses: { 200: postOut('OK'), 404: E.notFound } },
      patch: {
        tags: ['Posts'], summary: 'Edit post body and/or media (author only; link posts: body only)', security: AUTH, parameters: [pathParam('id')],
        requestBody: reqBody({ body: 'Updated text', mediaUrls: ['/uploads/3f2c9a1e-7b1d-4c55-9a52-2a0f5d1c1e11.png'] }),
        responses: { 200: postOut('Updated'), 400: E.validation, 401: E.unauthorized, 403: E.forbidden, 404: E.notFound },
      },
      delete: {
        tags: ['Posts', 'Moderation'], summary: 'Delete a post (author or community moderator)', security: AUTH, parameters: [pathParam('id')],
        responses: { 204: { description: 'Deleted' }, 401: E.unauthorized, 403: E.forbidden, 404: E.notFound },
      },
    },
    '/posts/{id}/vote': {
      put: {
        tags: ['Voting'], summary: 'Set my vote (+1, -1, or 0 to remove). Idempotent and atomic.', security: AUTH, parameters: [pathParam('id')],
        requestBody: reqBody({ value: 1 }),
        responses: { 200: ok('New score and my vote', ref('VoteResult')), 400: E.validation, 401: E.unauthorized, 404: E.notFound },
      },
    },
    '/posts/{id}/comments': {
      get: {
        tags: ['Comments'], summary: 'Flat list with parentId (client builds the tree)',
        parameters: [pathParam('id'), queryParam('sort', { type: 'string', enum: ['best', 'new', 'top'], default: 'best' })],
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: ref('Comment') } })), 404: E.notFound },
      },
      post: {
        tags: ['Comments'], summary: 'Add a top-level comment', security: AUTH, parameters: [pathParam('id')],
        requestBody: reqBody({ body: 'Nice post!' }),
        responses: { 201: commentOut('Created'), 400: E.validation, 401: E.unauthorized, 404: E.notFound },
      },
    },
    '/posts/{id}/summarize': {
      post: {
        tags: ['AI'], summary: 'AI summary of the post (cached, rate limited 5/min; mock when no API key)', security: AUTH, parameters: [pathParam('id')],
        responses: {
          200: { description: 'OK', content: { 'application/json': { example: { summary: 'The author asks...', cached: false } } } },
          401: E.unauthorized, 404: E.notFound, 429: E.rate, 502: err('AI_PROVIDER_ERROR'),
        },
      },
    },

    '/comments/{id}/replies': {
      post: {
        tags: ['Comments'], summary: 'Reply to a comment (unlimited nesting)', security: AUTH, parameters: [pathParam('id')],
        requestBody: reqBody({ body: 'I agree' }),
        responses: { 201: commentOut('Created'), 400: E.validation, 401: E.unauthorized, 404: E.notFound },
      },
    },
    '/comments/{id}': {
      patch: {
        tags: ['Comments'], summary: 'Edit a comment (author only)', security: AUTH, parameters: [pathParam('id')],
        requestBody: reqBody({ body: 'Edited' }),
        responses: { 200: commentOut('Updated'), 400: E.validation, 401: E.unauthorized, 403: E.forbidden, 404: E.notFound },
      },
      delete: {
        tags: ['Comments', 'Moderation'], summary: 'Delete a comment (author or moderator). Keeps "[deleted]" when it has replies.', security: AUTH,
        parameters: [pathParam('id')],
        responses: { 204: { description: 'Deleted' }, 401: E.unauthorized, 403: E.forbidden, 404: E.notFound },
      },
    },

   '/uploads': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload images/videos (multipart/form-data, field "files", max 10 files; images up to 10 MB, videos up to 50 MB)',
        security: AUTH,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: obj({ files: { type: 'array', items: { type: 'string', format: 'binary' } } }),
            },
          },
        },
        responses: {
          201: ok('Stored. Use the returned url in post mediaUrls.', obj({
            items: {
              type: 'array',
              items: obj({
                url: { type: 'string', example: '/uploads/3f2c9a1e-7b1d-4c55-9a52-2a0f5d1c1e11.png' },
                type: { type: 'string', enum: ['image', 'video'] },
                size: { type: 'integer' },
              }),
            },
          })),
          400: err('UPLOAD_ERROR / UNSUPPORTED_FILE_TYPE'),
          401: E.unauthorized,
          413: err('UPLOAD_ERROR (file too large)'),
          429: E.rate,
        },
      },
    },
    
        '/users/me/suggestions': {
      get: {
        tags: ['Social'], summary: 'People you may know (mutual follows + shared communities, newest members as filler)', security: AUTH,
        parameters: [queryParam('limit', { type: 'integer', default: 8, maximum: 30 })],
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: suggestionSchema } })), 401: E.unauthorized },
      },
    },
    '/users/me/following': {
      get: { tags: ['Social'], summary: 'People I follow', security: AUTH, responses: { 200: people('OK'), 401: E.unauthorized } },
    },
    '/users/me/followers': {
      get: { tags: ['Social'], summary: 'People who follow me', security: AUTH, responses: { 200: people('OK'), 401: E.unauthorized } },
    },
    '/users/{username}/follow': {
      post: {
        tags: ['Social'], summary: 'Follow a user (idempotent)', security: AUTH, parameters: [pathParam('username')],
        responses: { 200: ok('Following', followState), 400: err('CANNOT_FOLLOW_SELF'), 401: E.unauthorized, 404: E.notFound },
      },
      delete: {
        tags: ['Social'], summary: 'Unfollow a user', security: AUTH, parameters: [pathParam('username')],
        responses: { 200: ok('Unfollowed', followState), 401: E.unauthorized, 404: E.notFound },
      },
    },

    '/chats': {
      get: {
        tags: ['Chat'], summary: 'My chat threads with last message and unread count', security: AUTH,
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: chatSchema } })), 401: E.unauthorized },
      },
      post: {
        tags: ['Chat'], summary: 'Open (or create) a chat with 1-8 usernames. Several usernames make a group chat.', security: AUTH,
        requestBody: reqBody({ usernames: ['omar_dev'] }),
        responses: { 200: ok('OK', obj({ chat: chatSchema })), 400: err('VALIDATION_ERROR / CANNOT_CHAT_SELF'), 401: E.unauthorized, 404: E.notFound },
      },
    },
    '/chats/{id}/messages': {
      get: {
        tags: ['Chat'], summary: 'Messages of a chat, oldest first. Use nextBefore as "before" to load older ones.', security: AUTH,
        parameters: [pathParam('id'), queryParam('before', { type: 'string', format: 'date-time' }), queryParam('limit', { type: 'integer', default: 30, maximum: 50 })],
        responses: { 200: ok('OK', obj({ items: { type: 'array', items: messageSchema }, nextBefore: { type: 'string', nullable: true } })), 401: E.unauthorized, 404: E.notFound },
      },
      post: {
        tags: ['Chat'], summary: 'Send a message. Pushed live to all members over WebSocket (ws://host/ws, same auth cookie).', security: AUTH,
        parameters: [pathParam('id')], requestBody: reqBody({ body: 'Hello!' }),
        responses: { 201: ok('Sent', obj({ message: messageSchema })), 400: E.validation, 401: E.unauthorized, 404: E.notFound, 429: E.rate },
      },
    },
    '/chats/{id}/read': {
      post: {
        tags: ['Chat'], summary: 'Mark the chat as read for me', security: AUTH, parameters: [pathParam('id')],
        responses: { 204: { description: 'Marked as read' }, 401: E.unauthorized, 404: E.notFound },
      },
    },

    '/search': {
      get: {
        tags: ['Search'], summary: 'Search communities or users',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          queryParam('type', { type: 'string', enum: ['communities', 'users'], default: 'communities' }),
          queryParam('limit', { type: 'integer', default: 10 }),
        ],
        responses: { 200: { description: 'OK' }, 400: E.validation },
      },
    },
  },
};
