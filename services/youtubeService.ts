export interface YouTubeStats {
  viewers: number;
  likes: number;
  chatId?: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  message: string;
  profileUrl: string;
  timestamp: string;
}

class YouTubeService {
  private BASE_URL = 'https://www.googleapis.com/youtube/v3';

  async getVideoDetails(videoId: string, apiKey: string): Promise<YouTubeStats | null> {
    try {
      const url = `${this.BASE_URL}/videos?part=liveStreamingDetails,statistics&id=${videoId}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.items || data.items.length === 0) return null;

      const item = data.items[0];
      return {
        viewers: parseInt(item.liveStreamingDetails?.concurrentViewers || '0'),
        likes: parseInt(item.statistics?.likeCount || '0'),
        chatId: item.liveStreamingDetails?.activeLiveChatId
      };
    } catch (e) {
      console.error("YT API Error:", e);
      return null;
    }
  }

  async getChatMessages(chatId: string, apiKey: string, pageToken?: string): Promise<{ messages: ChatMessage[], nextPageToken: string }> {
    try {
      let url = `${this.BASE_URL}/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${apiKey}`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.items) return { messages: [], nextPageToken: '' };

      const messages: ChatMessage[] = data.items.map((item: any) => ({
        id: item.id,
        author: item.authorDetails.displayName,
        message: item.snippet.displayMessage,
        profileUrl: item.authorDetails.profileImageUrl,
        timestamp: item.snippet.publishedAt
      }));

      return {
        messages,
        nextPageToken: data.nextPageToken
      };
    } catch (e) {
      console.error("YT Chat Error:", e);
      return { messages: [], nextPageToken: '' };
    }
  }
}

export const youtubeService = new YouTubeService();