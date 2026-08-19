/**
 * Searches YouTube using the Data API v3 and returns the first real, working video URL.
 * Falls back to a YouTube search URL if the API fails or returns no results.
 */
export async function searchYouTube(query: string): Promise<{ title: string; url: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%20/g, "+")}`;

  if (!apiKey) {
    return { title: `Search YouTube: ${query}`, url: fallbackUrl };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: "1",
      relevanceLanguage: "en",
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!res.ok) {
      return { title: `Search YouTube: ${query}`, url: fallbackUrl };
    }

    const data = await res.json();
    const item = data?.items?.[0];

    if (!item) {
      return { title: `Search YouTube: ${query}`, url: fallbackUrl };
    }

    const videoId = item.id?.videoId;
    const videoTitle = item.snippet?.title ?? query;

    if (!videoId) {
      return { title: `Search YouTube: ${query}`, url: fallbackUrl };
    }

    return {
      title: videoTitle,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return { title: `Search YouTube: ${query}`, url: fallbackUrl };
  }
}
