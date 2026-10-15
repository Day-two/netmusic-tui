import type { Song, Playlist, TopList } from './store.js';

// Dynamic import for the API module
let apiModule: any = null;
let xeapiInitialized = false;

async function getApi() {
  if (!apiModule) {
    const mod = await import('@neteasecloudmusicapienhanced/api');
    // API functions are exported as default
    apiModule = mod.default || mod;
    
    // Try to initialize xeapi public key
    if (!xeapiInitialized) {
      try {
        if (typeof apiModule.register_xeapikey === 'function') {
          await apiModule.register_xeapikey();
          xeapiInitialized = true;
        }
      } catch (err) {
        // xeapi initialization failed, continue without it
        // Some features may not work but basic functionality should be available
        console.warn('xeapi initialization skipped:', err instanceof Error ? err.message : 'unknown error');
      }
    }
  }
  return apiModule;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Login with phone number and password
 */
export async function loginWithPhone(
  phone: string,
  password: string
): Promise<ApiResult<{ cookie: string; userId: number; nickname: string }>> {
  try {
    const api = await getApi();
    const result = await api.login_cellphone({ phone, password });
    
    if (result.body.code === 200) {
      const cookie = result.cookie?.join('; ') ?? '';
      return {
        success: true,
        data: {
          cookie,
          userId: result.body.account?.id ?? 0,
          nickname: result.body.profile?.nickname ?? 'User',
        },
      };
    }
    
    return { success: false, error: result.body.msg ?? 'Login failed' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Generate QR code key for login
 */
export async function getLoginQrKey(): Promise<ApiResult<string>> {
  try {
    const api = await getApi();
    const result = await api.login_qr_key({ timestamp: Date.now() });
    
    if (result.body.code === 200 && result.body.data?.unikey) {
      return { success: true, data: result.body.data.unikey };
    }
    
    return { success: false, error: 'Failed to generate QR key' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Create QR code image for login
 */
export async function createQrCode(key: string): Promise<ApiResult<string>> {
  try {
    const api = await getApi();
    const result = await api.login_qr_create({
      key,
      qrimg: true,
      timestamp: Date.now(),
    });
    
    if (result.body.code === 200 && result.body.data?.qrimg) {
      return { success: true, data: result.body.data.qrimg };
    }
    
    return { success: false, error: 'Failed to create QR code' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Check QR code login status
 */
export async function checkQrStatus(
  key: string
): Promise<ApiResult<{ status: number; cookie?: string; message?: string }>> {
  try {
    const api = await getApi();
    const result = await api.login_qr_check({
      key,
      timestamp: Date.now(),
    });
    
    return {
      success: true,
      data: {
        status: result.body.code ?? 801,
        cookie: result.cookie?.join('; '),
        message: result.body.message,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get login status from cookie
 */
export async function getLoginStatus(
  cookie: string
): Promise<ApiResult<{ userId: number; nickname: string }>> {
  try {
    const api = await getApi();
    const result = await api.login_status({ cookie });
    
    if (result.body.data?.profile) {
      return {
        success: true,
        data: {
          userId: result.body.data.profile.userId,
          nickname: result.body.data.profile.nickname,
        },
      };
    }
    
    return { success: false, error: 'Not logged in' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

// Search type constants matching API
export const SearchType = {
  SONG: 1,
  ALBUM: 10,
  ARTIST: 100,
  PLAYLIST: 1000,
  USER: 1002,
  MV: 1004,
  LYRIC: 1006,
  DJ: 1009,
  VIDEO: 1014,
} as const;

export type SearchTypeValue = typeof SearchType[keyof typeof SearchType];

// Search result types
export interface SearchResultArtist {
  id: number;
  name: string;
  picUrl?: string;
  alias?: string[];
}

export interface SearchResultAlbum {
  id: number;
  name: string;
  artist: string;
  picUrl?: string;
}

export interface SearchResultPlaylist {
  id: number;
  name: string;
  trackCount: number;
  creator: string;
  coverUrl?: string;
}

export interface SearchResultVideo {
  id: string;
  name: string;
  artist: string;
  duration: number;
  coverUrl?: string;
}

export interface SearchResultLyric {
  id: number;
  name: string;
  artist: string;
  album: string;
  duration: number;
}

export interface GenericSearchResult {
  songs?: Song[];
  artists?: SearchResultArtist[];
  albums?: SearchResultAlbum[];
  playlists?: SearchResultPlaylist[];
  videos?: SearchResultVideo[];
  lyrics?: SearchResultLyric[];
  total: number;
}

/**
 * Generic search function supporting multiple types
 */
export async function searchGeneric(
  keywords: string,
  type: SearchTypeValue,
  page: number = 1,
  limit: number = 30,
  cookie?: string
): Promise<ApiResult<GenericSearchResult>> {
  try {
    const api = await getApi();
    const offset = (page - 1) * limit;
    const result = await api.cloudsearch({
      keywords,
      type,
      limit,
      offset,
      cookie,
    });

    if (result.body.code !== 200 || !result.body.result) {
      return { success: false, error: 'Search failed' };
    }

    const res = result.body.result;
    const searchResult: GenericSearchResult = { total: 0 };

    switch (type) {
      case SearchType.SONG:
        if (res.songs) {
          searchResult.songs = res.songs.map((s: any) => ({
            id: s.id,
            name: s.name,
            artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
            album: s.al?.name ?? 'Unknown',
            duration: s.dt ?? 0,
          }));
          searchResult.total = res.songCount ?? res.songs.length;
        }
        break;

      case SearchType.ARTIST:
        if (res.artists) {
          searchResult.artists = res.artists.map((a: any) => ({
            id: a.id,
            name: a.name,
            picUrl: a.picUrl,
            alias: a.alias,
          }));
          searchResult.total = res.artistCount ?? res.artists.length;
        }
        break;

      case SearchType.ALBUM:
        if (res.albums) {
          searchResult.albums = res.albums.map((a: any) => ({
            id: a.id,
            name: a.name,
            artist: a.artist?.name ?? 'Unknown',
            picUrl: a.picUrl,
          }));
          searchResult.total = res.albumCount ?? res.albums.length;
        }
        break;

      case SearchType.PLAYLIST:
        if (res.playlists) {
          searchResult.playlists = res.playlists.map((p: any) => ({
            id: p.id,
            name: p.name,
            trackCount: p.trackCount ?? 0,
            creator: p.creator?.nickname ?? 'Unknown',
            coverUrl: p.coverImgUrl,
          }));
          searchResult.total = res.playlistCount ?? res.playlists.length;
        }
        break;

      case SearchType.VIDEO:
      case SearchType.MV:
        if (res.videos) {
          searchResult.videos = res.videos.map((v: any) => ({
            id: v.vid ?? v.id,
            name: v.title ?? v.name,
            artist: v.creator?.[0]?.userName ?? 'Unknown',
            duration: v.durationms ?? v.duration ?? 0,
            coverUrl: v.coverUrl,
          }));
          searchResult.total = res.videoCount ?? res.videos.length;
        }
        break;

      case SearchType.LYRIC:
        if (res.songs) {
          searchResult.lyrics = res.songs.map((s: any) => ({
            id: s.id,
            name: s.name,
            artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
            album: s.al?.name ?? 'Unknown',
            duration: s.dt ?? 0,
          }));
          searchResult.total = res.songCount ?? res.songs.length;
        }
        break;

      default:
        return { success: false, error: 'Unsupported search type' };
    }

    return { success: true, data: searchResult };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get song play URL
 */
export async function getSongUrl(
  id: number,
  cookie?: string
): Promise<ApiResult<string>> {
  try {
    const api = await getApi();
    
    // Try song_url_v1 first (requires xeapi)
    try {
      const result = await api.song_url_v1({
        id,
        level: 'exhigh',
        cookie,
      });
      
      if (result.body.code === 200 && result.body.data?.[0]?.url) {
        return { success: true, data: result.body.data[0].url };
      }
    } catch (xeapiErr) {
      // xeapi failed, fall back to song_url
    }
    
    // Fallback to song_url (works without xeapi)
    const result = await api.song_url({
      id,
      br: 320000, // Try high bitrate first
      cookie,
    });
    
    if (result.body.code === 200 && result.body.data?.[0]?.url) {
      return { success: true, data: result.body.data[0].url };
    }
    
    // Try standard bitrate
    const result2 = await api.song_url({
      id,
      br: 128000,
      cookie,
    });
    
    if (result2.body.code === 200 && result2.body.data?.[0]?.url) {
      return { success: true, data: result2.body.data[0].url };
    }
    
    return { success: false, error: 'Failed to get song URL' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get song lyrics
 */
export async function getLyric(
  id: number,
  cookie?: string
): Promise<ApiResult<{ lrc: string; tlyric?: string }>> {
  try {
    const api = await getApi();
    const result = await api.lyric({ id, cookie });
    
    if (result.body.code === 200) {
      return {
        success: true,
        data: {
          lrc: result.body.lrc?.lyric ?? '',
          tlyric: result.body.tlyric?.lyric,
        },
      };
    }
    
    return { success: false, error: 'Failed to get lyrics' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get user playlists
 */
export async function getUserPlaylists(
  uid: number,
  cookie?: string
): Promise<ApiResult<Playlist[]>> {
  try {
    const api = await getApi();
    const result = await api.user_playlist({
      uid,
      limit: 50,
      cookie,
    });
    
    if (result.body.code === 200 && result.body.playlist) {
      const playlists: Playlist[] = result.body.playlist.map((p: any) => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount ?? 0,
        coverUrl: p.coverImgUrl,
      }));
      
      return { success: true, data: playlists };
    }
    
    return { success: false, error: 'Failed to get playlists' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get playlist tracks
 */
export async function getPlaylistTracks(
  playlistId: number,
  cookie?: string
): Promise<ApiResult<Song[]>> {
  try {
    const api = await getApi();
    const result = await api.playlist_track_all({
      id: playlistId,
      cookie,
    });
    
    if (result.body.code === 200 && result.body.songs) {
      const songs: Song[] = result.body.songs.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: s.al?.name ?? 'Unknown',
        duration: s.dt ?? 0,
      }));
      
      return { success: true, data: songs };
    }
    
    return { success: false, error: 'Failed to get playlist tracks' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get daily recommendations
 */
export async function getDailyRecommendations(
  cookie: string
): Promise<ApiResult<Song[]>> {
  try {
    const api = await getApi();
    const result = await api.recommend_songs({ cookie });
    
    if (result.body.code === 200 && result.body.data?.dailySongs) {
      const songs: Song[] = result.body.data.dailySongs.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: s.al?.name ?? 'Unknown',
        duration: s.dt ?? 0,
      }));
      
      return { success: true, data: songs };
    }
    
    return { success: false, error: 'Failed to get recommendations' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get personal FM
 */
export async function getPersonalFm(
  cookie: string
): Promise<ApiResult<Song[]>> {
  try {
    const api = await getApi();
    const result = await api.personal_fm({ cookie });
    
    if (result.body.code === 200 && result.body.data) {
      const songs: Song[] = result.body.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: s.al?.name ?? 'Unknown',
        duration: s.dt ?? 0,
      }));
      
      return { success: true, data: songs };
    }
    
    return { success: false, error: 'Failed to get personal FM' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Like/unlike a song
 */
export async function toggleLike(
  id: number,
  like: boolean,
  cookie: string
): Promise<ApiResult<boolean>> {
  try {
    const api = await getApi();
    const result = await api.like({
      id,
      like: like.toString(),
      cookie,
    });
    
    return { success: result.body.code === 200 };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get all top lists (rankings)
 */
export async function getTopLists(): Promise<ApiResult<TopList[]>> {
  try {
    const api = await getApi();
    const result = await api.toplist();
    
    if (result.body.code === 200 && result.body.list) {
      const topLists: TopList[] = result.body.list.map((l: any) => ({
        id: l.id,
        name: l.name,
        description: l.description ?? '',
        coverUrl: l.coverImgUrl ?? '',
        updateFrequency: l.updateFrequency ?? '',
      }));
      
      return { success: true, data: topLists };
    }
    
    return { success: false, error: 'Failed to get top lists' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get artist detail (hot songs and albums)
 */
export async function getArtistDetail(
  id: number,
  cookie?: string
): Promise<ApiResult<{ name: string; songs: Song[]; albums: { id: number; name: string; picUrl?: string }[] }>> {
  try {
    const api = await getApi();
    const result = await api.artists({ id, cookie });

    if (result.body.code === 200) {
      const artistName = result.body.artist?.name ?? 'Unknown';
      const songs: Song[] = (result.body.hotSongs ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: s.al?.name ?? 'Unknown',
        duration: s.dt ?? 0,
      }));

      // Try to get albums separately
      let albums: { id: number; name: string; picUrl?: string }[] = [];
      try {
        const albumResult = await api.artist_album({ id, limit: 30, cookie });
        if (albumResult.body.code === 200 && albumResult.body.hotAlbums) {
          albums = albumResult.body.hotAlbums.map((a: any) => ({
            id: a.id,
            name: a.name,
            picUrl: a.picUrl,
          }));
        }
      } catch {
        // albums optional
      }

      return { success: true, data: { name: artistName, songs, albums } };
    }

    return { success: false, error: 'Failed to get artist detail' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get album songs
 */
export async function getAlbumSongs(
  id: number,
  cookie?: string
): Promise<ApiResult<{ name: string; songs: Song[] }>> {
  try {
    const api = await getApi();
    const result = await api.album({ id, cookie });

    if (result.body.code === 200) {
      const albumName = result.body.album?.name ?? 'Unknown';
      const songs: Song[] = (result.body.songs ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: albumName,
        duration: s.dt ?? 0,
      }));
      return { success: true, data: { name: albumName, songs } };
    }

    return { success: false, error: 'Failed to get album songs' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}

/**
 * Get top list detail (songs in a ranking)
 */
export async function getTopListDetail(
  id: number,
  cookie?: string
): Promise<ApiResult<Song[]>> {
  try {
    const api = await getApi();
    const result = await api.top_list({
      id,
      cookie,
    });
    
    if (result.body.code === 200 && result.body.playlist?.tracks) {
      const songs: Song[] = result.body.playlist.tracks.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => a.name).join(' / ') ?? 'Unknown',
        album: s.al?.name ?? 'Unknown',
        duration: s.dt ?? 0,
      }));
      
      return { success: true, data: songs };
    }
    
    return { success: false, error: 'Failed to get top list detail' };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' };
  }
}
