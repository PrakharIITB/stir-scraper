export function InstagramPostMedia({ media }) {
    if (!media || media.length === 0) {
      return <span>No media</span>
    }
  
    return (
      <div className="flex flex-wrap gap-2">
        {media.map((item, index) => (
          <div key={index} className="border rounded p-2">
            {item.media_type === "VIDEO" ? (
              <video src={item.video_url} controls className="w-24 h-24 object-cover">
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={item.thumbnail_url || "/placeholder.svg"}
                alt="Post thumbnail"
                className="w-24 h-24 object-cover"
              />
            )}
            <p className="text-xs mt-1">{item.media_type}</p>
          </div>
        ))}
      </div>
    )
  }
  
  