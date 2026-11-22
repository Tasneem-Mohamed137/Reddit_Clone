export const otherParticipants = (chat, me) => chat.participants.filter((p) => p.id !== me.id);

export const chatTitle = (chat, me) =>
  otherParticipants(chat, me)
    .map((p) => `u/${p.username}`)
    .join(', ') || 'Chat';