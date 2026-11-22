import FeedControls from '../components/feed/FeedControls';
import PostList from '../components/feed/PostList';
import { useFeedControls } from '../hooks/useFeedControls';

export default function PopularPage() {
  const controls = useFeedControls();
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Popular</h1>
      <FeedControls controls={controls} />
      <PostList path="/posts" controls={controls} />
    </>
  );
}