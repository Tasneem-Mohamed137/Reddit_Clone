// Posts live in two kinds of cache entries: infinite lists ['posts', ...] and single posts ['post', id].
// These helpers patch both, so a vote or a join shows up everywhere at once.
export const mapCachedPosts = (queryClient, fn) => {
  queryClient.setQueriesData({ queryKey: ['posts'] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(fn) })) } : data,
  );
  queryClient.setQueriesData({ queryKey: ['post'] }, (post) => (post ? fn(post) : post));
};

export const snapshotPosts = (queryClient) => [
  ...queryClient.getQueriesData({ queryKey: ['posts'] }),
  ...queryClient.getQueriesData({ queryKey: ['post'] }),
];

export const restorePosts = (queryClient, snapshot) => {
  snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
};