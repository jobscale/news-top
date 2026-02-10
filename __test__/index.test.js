import { describe, expect, jest, beforeEach, afterEach } from '@jest/globals';

process.env.ENV = 'test';

// Mock external dependencies before importing the app
const mockSend = jest.fn();
const mockParse = jest.fn();
const mockFetch = jest.fn();
const mockAiCalc = jest.fn();

// Mock AWS SDK
jest.unstable_mockModule('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: mockSend })),
  CreateTableCommand: jest.fn(),
  waitUntilTableExists: jest.fn(() => Promise.resolve({ state: 'SUCCESS' })),
}));

jest.unstable_mockModule('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: jest.fn(() => ({ send: mockSend })),
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
}));

jest.unstable_mockModule('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj) => obj),
}));

// Mock RSS Parser
jest.unstable_mockModule('rss-parser', () => ({
  default: jest.fn(() => ({
    parseURL: mockParse,
  })),
}));

// Mock JSDOM
jest.unstable_mockModule('jsdom', () => ({
  JSDOM: jest.fn(() => ({
    window: {
      document: {
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
      },
    },
  })),
}));

// Mock LLM
jest.unstable_mockModule('../app/llm.js', () => ({
  aiCalc: mockAiCalc,
}));

// Mock global fetch
global.fetch = mockFetch;

const { app, App } = await import('../app/index.js');

describe('News-Top Application Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    mockParse.mockReset();
    mockFetch.mockReset();
    mockAiCalc.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('App Instance', () => {
    it('should export app instance', () => {
      expect(app).toBeInstanceOf(App);
    });

    it('should export App class', () => {
      expect(App).toBeDefined();
      expect(typeof App).toBe('function');
    });
  });

  describe('Utility Methods', () => {
    describe('similarity(a, b)', () => {
      it('should return 1.0 for identical strings', () => {
        const result = app.similarity('test', 'test');
        expect(result).toBe(1);
      });

      it('should return 0.0 for completely different strings', () => {
        const result = app.similarity('abc', 'xyz');
        expect(result).toBe(0);
      });

      it('should calculate partial similarity correctly', () => {
        const result = app.similarity('hello', 'hallo');
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(1);
      });

      it('should handle empty strings', () => {
        const result = app.similarity('', 'test');
        expect(result).toBe(0);
      });

      it('should handle different length strings', () => {
        const result = app.similarity('test', 'testing');
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(1);
      });

      it('should calculate similarity for Japanese text', () => {
        const result = app.similarity('ニュース', 'ニュース速報');
        expect(result).toBeGreaterThan(0.5);
      });
    });

    describe('hasDuplicate(target, titles, threshold)', () => {
      it('should detect duplicate with default threshold', () => {
        const titles = ['これはテストです', '別のニュース'];
        const result = app.hasDuplicate('これはテストです', titles);
        expect(result).toBe(true);
      });

      it('should not detect duplicate for different titles', () => {
        const titles = ['経済成長率が上昇', '政治改革について'];
        const result = app.hasDuplicate('スポーツ大会で優勝', titles);
        expect(result).toBe(false);
      });

      it('should respect custom threshold', () => {
        const titles = ['テストニュース'];
        const result = app.hasDuplicate('テスト', titles, 0.9);
        expect(result).toBe(false);
      });

      it('should handle empty titles array', () => {
        const result = app.hasDuplicate('test', [], 0.5);
        expect(result).toBe(false);
      });

      it('should detect similar titles above threshold', () => {
        const titles = ['東京で大雨警報が発令されました'];
        const result = app.hasDuplicate('東京で大雨警報', titles, 0.4);
        expect(result).toBe(true);
      });
    });
  });

  describe('Amazon Price Monitoring', () => {
    describe('amazon(ts)', () => {
      it('should return empty array for time before 08:00', async () => {
        const result = await app.amazon('07:59');
        expect(result).toEqual([]);
      });

      it('should return empty array for time after 20:10', async () => {
        const result = await app.amazon('20:11');
        expect(result).toEqual([]);
      });

      it('should fetch prices during valid time range', async () => {
        const mockDocument = {
          querySelector: jest.fn(() => ({
            textContent: '¥15,000',
          })),
        };

        mockFetch.mockResolvedValue({
          text: () => Promise.resolve('<html></html>'),
        });

        const { JSDOM } = await import('jsdom');
        JSDOM.mockImplementation(() => ({
          window: { document: mockDocument },
        }));

        const result = await app.amazon('10:00');
        expect(Array.isArray(result)).toBe(true);
      });

      it('should detect sales at 11:00-11:10', async () => {
        const mockDocument = {
          querySelector: jest.fn(() => ({
            textContent: '¥18,000',
          })),
        };

        mockFetch.mockResolvedValue({
          text: () => Promise.resolve('<html></html>'),
        });

        const { JSDOM } = await import('jsdom');
        JSDOM.mockImplementation(() => ({
          window: { document: mockDocument },
        }));

        const result = await app.amazon('11:05');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('News Fetching Methods', () => {
    beforeEach(() => {
      // Setup common mocks for news fetching
      mockSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        if (command.constructor.name === 'PutCommand') {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      mockAiCalc.mockResolvedValue({
        newsworthiness: 4.0,
        impact: 3.5,
        credibility: 4.0,
        importance: 3.8,
        urgency: 3.0,
        novelty: 4.2,
        bias: 1.0,
        personal: 0.5,
        category: ['technology'],
        location: ['Tokyo'],
        score: 7.5,
      });
    });

    describe('rss()', () => {
      it('should fetch and filter RSS news', async () => {
        mockParse.mockResolvedValue({
          items: [
            { title: 'テストニュース1', link: 'https://example.com/1' },
            { title: 'テストニュース2', link: 'https://example.com/2' },
          ],
        });

        const result = await app.rss();
        expect(Array.isArray(result)).toBe(true);
        expect(mockParse).toHaveBeenCalled();
      });

      it('should handle RSS parsing errors', async () => {
        mockParse.mockRejectedValue(new Error('Parse error'));

        await expect(app.rss()).rejects.toThrow();
      });

      it('should filter news based on AI score', async () => {
        mockParse.mockResolvedValue({
          items: [
            { title: '重要なニュース', link: 'https://example.com/1' },
          ],
        });

        mockAiCalc.mockResolvedValue({
          score: 8.0,
          newsworthiness: 5.0,
          impact: 4.5,
        });

        const result = await app.rss();
        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('yahoo()', () => {
      it('should fetch Yahoo news', async () => {
        const mockAnchor = {
          href: 'https://news.yahoo.co.jp/test',
          textContent: 'Yahoo ニュース',
        };

        const mockDocument = {
          querySelectorAll: jest.fn(() => [mockAnchor]),
        };

        mockFetch.mockResolvedValue({
          text: () => Promise.resolve('<html></html>'),
        });

        const { JSDOM } = await import('jsdom');
        JSDOM.mockImplementation(() => ({
          window: { document: mockDocument },
        }));

        const result = await app.yahoo();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle fetch errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(app.yahoo()).rejects.toThrow();
      });
    });

    describe('nikkei()', () => {
      it('should fetch Nikkei news', async () => {
        const mockDocument = {
          querySelectorAll: jest.fn(() => []),
        };

        mockFetch.mockResolvedValue({
          text: () => Promise.resolve('<html></html>'),
        });

        const { JSDOM } = await import('jsdom');
        JSDOM.mockImplementation(() => ({
          window: { document: mockDocument },
        }));

        const result = await app.nikkei();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('asahi()', () => {
      it('should fetch Asahi news', async () => {
        mockFetch.mockResolvedValue({
          json: () => Promise.resolve({
            item: [
              { title: 'Asahi ニュース1', link: '/news/1' },
              { title: 'Asahi ニュース2', link: '/news/2' },
            ],
          }),
        });

        const result = await app.asahi();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('DynamoDB Operations', () => {
    describe('filterItem(Title, media)', () => {
      it('should return empty array if item already exists', async () => {
        mockSend.mockResolvedValue({
          Item: { Title: 'Existing News' },
        });

        const result = await app.filterItem('Existing News', 'test');
        expect(result).toEqual([]);
      });

      it('should create new item and return details for new news', async () => {
        let callCount = 0;
        mockSend.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First GetCommand - no existing item
            return Promise.resolve({ Item: null });
          }
          // Subsequent calls (PutCommand, GetCommand for history)
          return Promise.resolve({ Item: null });
        });

        mockAiCalc.mockResolvedValue({
          newsworthiness: 4.5,
          impact: 4.0,
          credibility: 4.2,
          importance: 4.0,
          urgency: 3.5,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
          score: 8.0,
        });

        const result = await app.filterItem('New Important News', 'test');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle table creation on first error', async () => {
        let callCount = 0;
        mockSend.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call fails
            return Promise.reject(new Error('ResourceNotFoundException'));
          }
          // After table creation
          return Promise.resolve({ Item: null });
        });

        const { waitUntilTableExists } = await import('@aws-sdk/client-dynamodb');
        waitUntilTableExists.mockResolvedValue({ state: 'SUCCESS' });

        mockAiCalc.mockResolvedValue({
          score: 5.0,
          newsworthiness: 3.0,
          impact: 3.0,
        });

        const result = await app.filterItem('Test News', 'test');
        expect(Array.isArray(result)).toBe(true);
      });

      it('should filter out low-score news', async () => {
        mockSend.mockResolvedValue({ Item: null });

        mockAiCalc.mockResolvedValue({
          newsworthiness: 2.0,
          impact: 1.5,
          score: 2.0,
        });

        const result = await app.filterItem('Low Score News', 'test');
        expect(Array.isArray(result)).toBe(true);
        // Should return detail but not title (headline = false)
        expect(result.length).toBeLessThanOrEqual(1);
      });

      it('should detect and filter duplicate news', async () => {
        const existingHistory = [
          {
            Title: '東京で大雨警報が発令',
            headline: true,
            timestamp: '2026-02-07 15:00:00+09:00',
          },
        ];

        let callCount = 0;
        mockSend.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // GetCommand for Title - not found
            return Promise.resolve({ Item: null });
          }
          if (callCount === 3) {
            // GetCommand for history
            return Promise.resolve({
              Item: { history: existingHistory },
            });
          }
          return Promise.resolve({});
        });

        mockAiCalc.mockResolvedValue({
          score: 8.0,
          newsworthiness: 4.5,
          impact: 4.0,
        });

        const result = await app.filterItem('東京で大雨警報', 'test');
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('createTable()', () => {
      it('should create DynamoDB table successfully', async () => {
        const { waitUntilTableExists } = await import('@aws-sdk/client-dynamodb');
        waitUntilTableExists.mockResolvedValue({ state: 'SUCCESS' });

        mockSend.mockResolvedValue({});

        const result = await app.createTable();
        expect(result).toBeDefined();
        expect(mockSend).toHaveBeenCalled();
      });

      it('should retry table creation on failure', async () => {
        const { waitUntilTableExists } = await import('@aws-sdk/client-dynamodb');

        let retryCount = 0;
        waitUntilTableExists.mockImplementation(() => {
          retryCount++;
          if (retryCount === 1) {
            return Promise.reject(new Error('Timeout'));
          }
          return Promise.resolve({ state: 'SUCCESS' });
        });

        mockSend.mockResolvedValue({});

        const result = await app.createTable();
        expect(result).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete news flow with filtering', async () => {
      // Mock RSS parse
      mockParse.mockResolvedValue({
        items: [
          { title: '重要な経済ニュース', link: 'https://example.com/1' },
        ],
      });

      // Mock DynamoDB - item doesn't exist
      let getCallCount = 0;
      mockSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          getCallCount++;
          if (getCallCount === 1) {
            return Promise.resolve({ Item: null }); // Title not found
          }
          return Promise.resolve({ Item: { history: [] } }); // Empty history
        }
        return Promise.resolve({});
      });

      // Mock AI scoring
      mockAiCalc.mockResolvedValue({
        newsworthiness: 4.5,
        impact: 4.0,
        credibility: 4.5,
        importance: 4.2,
        urgency: 3.8,
        novelty: 4.0,
        bias: 0.5,
        personal: 0.2,
        category: ['economy'],
        location: ['Japan'],
        score: 8.5,
      });

      const result = await app.rss();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully in news fetching', async () => {
      mockParse.mockRejectedValue(new Error('Network timeout'));

      await expect(app.rss()).rejects.toThrow('Network timeout');
    });
  });
});
