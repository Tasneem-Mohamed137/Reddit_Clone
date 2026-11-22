// Adds a message to the newest page of an already-loaded conversation (skipping duplicates,
// because the sender gets the message both from the REST reply and from the WebSocket push).
export const appendMessage = (queryClient, message) => {
  queryClient.setQueryData(['chat-messages', message.chatId], (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page, i) =>
        i === 0 && !page.items.some((m) => m.id === message.id) ? { ...page, items: [...page.items, message] } : page,
      ),
    };
  });
};