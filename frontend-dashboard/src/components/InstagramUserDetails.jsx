import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";

export function InstagramUserDetails() {
    const userId = useParams().id
    const [influencer, setInfluencer] = useState(null);
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const observer = useRef();
    

    useEffect(() => {
        fetch(`http://104.131.101.181:5000/api/influencer/${userId}`)
            .then(res => res.json())
            .then(data => setInfluencer(data));
    }, [userId]);

    const fetchPosts = useCallback(() => {
        if (page > totalPages) return;

        fetch(`http://104.131.101.181:5000/api/influencer/${userId}/posts?page=${page}&limit=20`)
            .then(res => res.json())
            .then(data => {
                setPosts(prev => [...prev, ...data.posts]);
                setTotalPages(data.totalPages);
            });
    }, [userId, page, totalPages]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const lastPostRef = useCallback((node) => {
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) {
                setPage(prev => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [page, totalPages]);

    if (!influencer) return <p>Loading...</p>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <img src={influencer.influencer.profile_photo_hd} className="w-20 h-20 rounded-full" alt="Profile" />
                <div>
                    <h1 className="text-xl font-bold">{influencer.influencer.username}</h1>
                    <p className="text-gray-500">{influencer.influencer.biography}</p>
                    <p>Followers: {influencer.influencer.followers_count}</p>
                    <p>Posts Scraped: {influencer.totalPosts}</p>
                    <p>Avg Likes: {influencer.avgLikes.toFixed(2)}</p>
                    <p>Movies Worked With: {influencer.movieCount}</p>
                </div>
            </div>

            <h2 className="mt-6 text-lg font-semibold">Posts</h2>
            <div className="grid grid-cols-3 gap-4">
                {posts.map((post, index) => (
                    <div key={post.post_id} ref={index === posts.length - 1 ? lastPostRef : null} className="border p-2 rounded">
                      {post.post_type === 'album' ? <img src={post.media[0].thumbnail_url} alt="Post" className="w-full h-40 object-cover rounded" />:<img src={post.thumbnail_img} alt="Post" className="w-full h-40 object-cover rounded" />}
                        <p>{post.caption?.slice(0, 50)}...</p>
                        <p>Likes: {post.likes_count}</p>
                        <p>Comments: {post.comments_count}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
