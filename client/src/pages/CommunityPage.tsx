import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../api/community';
import { useAuthStore } from '../stores/authStore';
import { useSpoilerStore } from '../stores/spoilerStore';
import type { CommunityPost } from '../types';
import CategoryTabs from '../components/community/CategoryTabs';
import SearchBar from '../components/community/SearchBar';
import PostCard from '../components/community/PostCard';

type SpoilerFilterMode = 'off' | 'hide_completely' | 'hide_content';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    letterSpacing: '-0.3px',
  },
  writeButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(102,126,234,0.25)',
  },
  writeButtonDisabled: {
    padding: '10px 20px',
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  loginPrompt: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
    textAlign: 'right' as const,
  },
  spoilerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: '10px 14px',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  spoilerLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginRight: 8,
  },
  spoilerSelect: {
    padding: '6px 12px',
    fontSize: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    backgroundColor: '#fff',
    color: '#4a5568',
    cursor: 'pointer',
    outline: 'none',
  },
  loadMoreButton: {
    display: 'block',
    width: '100%',
    padding: '12px',
    marginTop: 16,
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'background-color 0.2s',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#a0aec0',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#a0aec0',
    fontSize: 14,
  },
  searchResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: '8px 0',
  },
  searchResultText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: 600,
  },
  backButton: {
    padding: '6px 14px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
};

function CommunityPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { mode: spoilerMode, fetchSetting, updateSetting } = useSpoilerStore();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch spoiler setting on mount if logged in
  useEffect(() => {
    if (accessToken) {
      fetchSetting();
    }
  }, [accessToken, fetchSetting]);

  const fetchPosts = useCallback(async (category: string, cursorParam?: string) => {
    try {
      const params: Record<string, string | number | undefined> = {
        limit: 20,
        cursor: cursorParam || undefined,
        category: category === 'all' ? undefined : category,
        spoilerFilter: accessToken && spoilerMode !== 'off' ? spoilerMode : undefined,
      };

      const res = await communityApi.listPosts(params as any);
      const data = res.data;

      if (cursorParam) {
        setPosts((prev) => [...prev, ...(data.data || [])]);
      } else {
        setPosts(data.data || []);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      if (!cursorParam) {
        setPosts([]);
      }
    }
  }, [accessToken, spoilerMode]);

  const fetchSearchResults = useCallback(async (query: string, cursorParam?: string) => {
    try {
      const params = {
        q: query,
        limit: 20,
        cursor: cursorParam || undefined,
      };

      const res = await communityApi.search(params as any);
      const data = res.data;

      if (cursorParam) {
        setPosts((prev) => [...prev, ...(data.data || [])]);
      } else {
        setPosts(data.data || []);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to search posts:', err);
      if (!cursorParam) {
        setPosts([]);
      }
    }
  }, []);

  // Initial load and category/spoiler change
  useEffect(() => {
    if (searchMode) return;
    setLoading(true);
    setCursor(null);
    fetchPosts(selectedCategory).finally(() => setLoading(false));
  }, [selectedCategory, spoilerMode, searchMode, fetchPosts]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchMode(false);
    setSearchQuery('');
  };

  const handleSearch = (query: string) => {
    setSearchMode(true);
    setSearchQuery(query);
    setLoading(true);
    setCursor(null);
    fetchSearchResults(query).finally(() => setLoading(false));
  };

  const handleSearchClear = () => {
    setSearchMode(false);
    setSearchQuery('');
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    if (searchMode) {
      await fetchSearchResults(searchQuery, cursor);
    } else {
      await fetchPosts(selectedCategory, cursor);
    }
    setLoadingMore(false);
  };

  const handleSpoilerChange = (newMode: SpoilerFilterMode) => {
    updateSetting(newMode);
  };

  const handleWriteClick = () => {
    if (!accessToken) return;
    navigate('/community/write');
  };

  const isSpoilerMasked = (post: CommunityPost): boolean => {
    // When mode is hide_content, the server returns posts but we mask content on client
    // The server handles hide_completely by not returning those posts
    if (spoilerMode === 'hide_content' && post.isHidden === false) {
      // If the post has a special marker from the server indicating it should be masked
      // For now, we rely on the server's spoiler filter logic
      // The server will handle filtering; client just shows what's returned
      return false;
    }
    return false;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>커뮤니티</h1>
        <div>
          {accessToken ? (
            <button style={styles.writeButton} onClick={handleWriteClick}>
              ✏️ 글 작성
            </button>
          ) : (
            <div>
              <button style={styles.writeButtonDisabled} disabled>
                ✏️ 글 작성
              </button>
              <div style={styles.loginPrompt}>로그인 후 글을 작성할 수 있습니다</div>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} onClear={handleSearchClear} />

      {/* Category Tabs (hidden during search) */}
      {!searchMode && (
        <CategoryTabs selected={selectedCategory} onSelect={handleCategorySelect} />
      )}

      {/* Spoiler Filter (only for logged-in users) */}
      {accessToken && !searchMode && (
        <div style={styles.spoilerSection}>
          <span style={styles.spoilerLabel}>🔒 스포일러 필터:</span>
          <select
            style={styles.spoilerSelect}
            value={spoilerMode}
            onChange={(e) => handleSpoilerChange(e.target.value as SpoilerFilterMode)}
            aria-label="스포일러 필터 설정"
          >
            <option value="off">끄기</option>
            <option value="hide_completely">완전 숨김</option>
            <option value="hide_content">내용만 숨김</option>
          </select>
        </div>
      )}

      {/* Search Result Header */}
      {searchMode && (
        <div style={styles.searchResultHeader}>
          <span style={styles.searchResultText}>
            &quot;{searchQuery}&quot; 검색 결과
          </span>
          <button style={styles.backButton} onClick={handleSearchClear}>
            ← 목록으로
          </button>
        </div>
      )}

      {/* Post List */}
      {loading ? (
        <div style={styles.loading}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div style={styles.emptyState}>
          {searchMode ? '검색 결과가 없습니다' : '아직 게시글이 없습니다.'}
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              spoilerMasked={isSpoilerMasked(post)}
            />
          ))}

          {hasMore && (
            <button
              style={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default CommunityPage;
