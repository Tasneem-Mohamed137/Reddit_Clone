import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { resetDb, flush } from '../repositories/mock/store.js';
import { userRepo, communityRepo, postRepo, commentRepo, voteRepo, followRepo, chatRepo } from '../repositories/index.js';

if (env.dbDriver !== 'mock') throw new Error('Seeding is only for DB_DRIVER=mock');

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const PASSWORD = 'Password123!';

resetDb();
const passwordHash = await bcrypt.hash(PASSWORD, 10);

const [tasneem, omar, salma] = await Promise.all(
  ['tasneem', 'omar_dev', 'salma'].map((username) =>
    userRepo.create({ email: `${username}@example.com`, username, passwordHash }),
  ),
);

const programming = await communityRepo.create({
  name: 'programming', description: 'Computer programming news and questions.', creatorId: omar.id,
});
const egypt = await communityRepo.create({
  name: 'Egypt', description: 'كل حاجة عن مصر.', creatorId: salma.id,
});
const askReddit = await communityRepo.create({
  name: 'AskReddit', description: 'Ask questions, get answers.', creatorId: tasneem.id,
});

// The creator is automatically the moderator; others join as members.
await communityRepo.addMember(programming.id, omar.id, 'moderator');
await communityRepo.addMember(egypt.id, salma.id, 'moderator');
await communityRepo.addMember(askReddit.id, tasneem.id, 'moderator');
await communityRepo.addMember(programming.id, tasneem.id);
await communityRepo.addMember(programming.id, salma.id);
await communityRepo.addMember(egypt.id, tasneem.id);
await communityRepo.addMember(askReddit.id, omar.id);

const post1 = await postRepo.create({
  communityId: programming.id, authorId: omar.id, type: 'text',
  title: 'What is the best way to learn the repository pattern?',
  body: 'I keep mixing storage logic into my controllers. Any good resources?', createdAt: hoursAgo(2),
});
await postRepo.create({
  communityId: egypt.id, authorId: salma.id, type: 'text',
  title: 'أفضل أماكن المذاكرة في القاهرة؟', body: 'محتاجة مكان هادي أذاكر فيه.', createdAt: hoursAgo(5),
});
await postRepo.create({
  communityId: askReddit.id, authorId: tasneem.id, type: 'text',
  title: 'What small habit improved your productivity the most?', createdAt: hoursAgo(9),
});

// Nested thread: c1 -> c2 -> c3
const c1 = await commentRepo.create({ postId: post1.id, authorId: salma.id, body: 'Start with a tiny interface and one mock implementation.', createdAt: hoursAgo(1.5) });
const c2 = await commentRepo.create({ postId: post1.id, parentId: c1.id, authorId: omar.id, body: 'That is exactly what I am doing now, thanks!', createdAt: hoursAgo(1) });
await commentRepo.create({ postId: post1.id, parentId: c2.id, authorId: salma.id, body: 'Nice. Swapping to Mongo later will be one config line.', createdAt: hoursAgo(0.5) });

// Extra posts so infinite scroll (page size 10) has something to load.
const communities = [programming, egypt, askReddit];
const authors = [tasneem, omar, salma];
for (let i = 1; i <= 24; i += 1) {
  const sample = await postRepo.create({
    communityId: communities[i % 3].id,
    authorId: authors[i % 3].id,
    type: 'text',
    title: `Sample post #${i}: thoughts on topic ${i}`,
    body: `This is the body of sample post number ${i}.`,
    createdAt: hoursAgo(10 + i * 3),
  });
  if (i % 4 === 0) await voteRepo.setVote(omar.id, sample.id, 1);
}

// Media + link posts to test the image carousel and link cards.
await postRepo.create({
  communityId: programming.id, authorId: omar.id, type: 'image', title: 'My desk setup',
  mediaUrls: ['https://picsum.photos/seed/desk1/900/600', 'https://picsum.photos/seed/desk2/900/600'],
  createdAt: hoursAgo(1),
});
await postRepo.create({
  communityId: programming.id, authorId: salma.id, type: 'link', title: 'Great read on the repository pattern',
  linkUrl: 'https://martinfowler.com/eaaCatalog/repository.html', createdAt: hoursAgo(3),
});

await voteRepo.setVote(tasneem.id, post1.id, 1);
await voteRepo.setVote(salma.id, post1.id, 1);

// More people, so "People you may know", following and chat have something to show.
const [nour, youssef, hana, karim, mariam] = await Promise.all(
  ['nour', 'youssef_m', 'hana', 'karim_dev', 'mariam'].map((username) =>
    userRepo.create({ email: `${username}@example.com`, username, passwordHash }),
  ),
);
await communityRepo.addMember(programming.id, nour.id);
await communityRepo.addMember(programming.id, karim.id);
await communityRepo.addMember(egypt.id, hana.id);
await communityRepo.addMember(egypt.id, mariam.id);
await communityRepo.addMember(askReddit.id, youssef.id);

await followRepo.follow(tasneem.id, omar.id);
await followRepo.follow(omar.id, nour.id);
await followRepo.follow(omar.id, karim.id);
await followRepo.follow(salma.id, tasneem.id);
await followRepo.follow(nour.id, tasneem.id);

const chat = await chatRepo.create({ participantIds: [tasneem.id, omar.id], creatorId: omar.id });
await chatRepo.addMessage({ chatId: chat.id, senderId: omar.id, body: 'Hey! Did you finish the repository pattern part?' });
await chatRepo.addMessage({ chatId: chat.id, senderId: tasneem.id, body: 'Almost, working on the voting tests now.' });
await chatRepo.addMessage({ chatId: chat.id, senderId: omar.id, body: 'Nice, ping me when it is done.' });

flush();
console.log(`Seeded. Log in with username "tasneem" and password "${PASSWORD}"`);