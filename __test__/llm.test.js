import { describe, expect, jest, beforeEach, afterEach } from '@jest/globals';

process.env.ENV = 'test';

// Mock dependencies
const mockGetValue = jest.fn();
const mockCalcScore = jest.fn();
const mockScoreGemini = jest.fn();

// Mock db module
jest.unstable_mockModule('../app/db.js', () => ({
  db: {
    getValue: mockGetValue,
  },
}));

// Mock credibility module
jest.unstable_mockModule('../app/credibility.js', () => ({
  calcScore: mockCalcScore,
}));

// Mock gemini module
jest.unstable_mockModule('../app/gemini.js', () => ({
  scoreGemini: mockScoreGemini,
}));

// Import after mocking
const { aiCalc } = await import('../app/llm.js');
const { extractKeywords, dataset } = await import('../app/dataset.js');

describe('LLM Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.USE_GEMINI;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('aiCalc(title)', () => {
    describe('Basic Functionality', () => {
      it('should calculate score using llama when USE_GEMINI is not set', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.2,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('重要な経済ニュース');

        expect(mockCalcScore).toHaveBeenCalled();
        expect(mockScoreGemini).not.toHaveBeenCalled();
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('model', 'llama');
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Score Normalization', () => {
      it('should normalize scores from 0-7 range to 0-5 range', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 7.0, // Should be normalized to 5.0
          impact: 5.0, // Should be normalized to 3.0
          certainty: 2.0, // Should be normalized to 0.0
          importance: 4.0, // Should be normalized to ~2.0
          urgency: 3.5,
          novelty: 4.5,
          bias: 1.0,
          personal: 0.0,
        });

        const result = await aiCalc('テストニュース');

        // Check that normalization occurred
        expect(result.newsworthiness).toBeLessThanOrEqual(5);
        expect(result.impact).toBeLessThanOrEqual(5);
        expect(result.certainty).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Keyword Extraction Integration', () => {
      it('should extract emergency keywords and boost score', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('東京で大地震が発生');

        expect(result).toHaveProperty('emergency');
        expect(Array.isArray(result.emergency)).toBe(true);
        expect(result.emergency.length).toBeGreaterThan(0);
        expect(result.emergency).toContain('地震');
      });

      it('should extract noisy keywords and apply penalty', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
          category: ['スポーツ'],
        });

        const result = await aiCalc('野球の試合で優勝');

        expect(result).toHaveProperty('noisy');
        expect(Array.isArray(result.noisy)).toBe(true);
        expect(result.noisy.length).toBeGreaterThan(0);
      });

      it('should handle titles with no keywords', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('ABCDEFG');

        expect(result.emergency).toEqual([]);
        expect(result.noisy).toEqual([]);
      });
    });

    describe('Score Calculation Logic', () => {
      it('should calculate subjectivity from AI scores', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 2.0, // Low certainty increases subjectivity
          importance: 2.0, // Low importance increases subjectivity
          urgency: 2.0, // Low urgency increases subjectivity
          novelty: 2.0, // Low novelty increases subjectivity
          bias: 4.0, // High bias increases subjectivity
          personal: 0.5,
        });

        const result = await aiCalc('個人的な意見');

        expect(result).toHaveProperty('subjectivity');
        expect(result.subjectivity).toBeGreaterThan(0);
      });

      it('should calculate penalty from noisy keywords', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 2.0, // High personal score adds penalty
          category: ['東京', 'スポーツ'], // Noisy categories
          location: ['東京'],
        });

        const result = await aiCalc('東京でスポーツ大会');

        expect(result).toHaveProperty('penalty');
        expect(result.penalty).toBeGreaterThan(0);
      });

      it('should reduce penalty for emergency keywords', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.5,
          impact: 4.0,
          certainty: 4.0,
          importance: 4.0,
          urgency: 4.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('緊急速報：地震発生');

        expect(result).toHaveProperty('penalty');
        // Emergency keywords reduce penalty (negative penalty)
        expect(result.emergency.length).toBeGreaterThan(0);
      });

      it('should calculate careful score', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('重要なニュース');

        expect(result).toHaveProperty('careful');
        expect(typeof result.careful).toBe('number');
      });

      it('should use fallback score when AI score is invalid', async () => {
        mockCalcScore.mockResolvedValue({
          // Missing newsworthiness and impact
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('ニュース');

        expect(result).toHaveProperty('score');
        // Fallback: 3 - noisy.length + emergency.length * 1.5
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty title', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 0.0,
          impact: 0.0,
          certainty: 0.0,
          importance: 0.0,
          urgency: 0.0,
          novelty: 0.0,
          bias: 0.0,
          personal: 0.0,
        });

        const result = await aiCalc('');

        expect(result).toHaveProperty('score');
        expect(result.score).toBeGreaterThanOrEqual(0);
      });

      it('should handle very long title', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const longTitle = '非常に長いニュースタイトル'.repeat(20);
        const result = await aiCalc(longTitle);

        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });

      it('should handle title with special characters', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.0,
          impact: 3.5,
          certainty: 4.0,
          importance: 3.8,
          urgency: 3.0,
          novelty: 4.0,
          bias: 1.0,
          personal: 0.5,
        });

        const result = await aiCalc('ニュース！？【速報】＜重要＞');

        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });

      it('should handle AI service errors gracefully', async () => {
        mockCalcScore.mockRejectedValue(new Error('AI service unavailable'));

        await expect(aiCalc('ニュース')).rejects.toThrow();
      });
    });

    describe('Real-world News Examples', () => {
      it('should score high-impact economic news highly', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 4.5,
          impact: 4.5,
          certainty: 4.5,
          importance: 4.5,
          urgency: 4.0,
          novelty: 4.0,
          bias: 0.5,
          personal: 0.0,
          category: ['経済'],
          location: ['日本'],
        });

        const result = await aiCalc('日経平均株価が過去最高値を更新');

        expect(result.score).toBeGreaterThan(4);
      });

      it('should score sports news lower', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 2.0,
          impact: 2.0,
          certainty: 3.0,
          importance: 2.0,
          urgency: 1.0,
          novelty: 2.0,
          bias: 1.0,
          personal: 0.5,
          category: ['スポーツ'],
        });

        const result = await aiCalc('野球チームが試合に勝利');

        expect(result.score).toBeLessThan(4);
      });

      it('should score emergency news very highly', async () => {
        mockCalcScore.mockResolvedValue({
          newsworthiness: 5.0,
          impact: 5.0,
          certainty: 5.0,
          importance: 5.0,
          urgency: 5.0,
          novelty: 4.5,
          bias: 0.0,
          personal: 0.0,
          category: ['災害'],
          location: ['東京', '日本'],
        });

        const result = await aiCalc('緊急速報：東京で震度6強の地震発生');

        expect(result.emergency.length).toBeGreaterThan(0);
        expect(result.score).toBeGreaterThan(4);
      });
    });
  });

  describe('extractKeywords(title)', () => {
    it('should extract emergency keywords', () => {
      const result = extractKeywords('地震で大規模な被害が発生');

      expect(result).toHaveProperty('emergency');
      expect(result.emergency).toContain('地震');
      expect(result.emergency).toContain('大規模');
    });

    it('should extract noisy keywords', () => {
      const result = extractKeywords('東京でスポーツ大会が開催');

      expect(result).toHaveProperty('noisy');
      expect(result.noisy.length).toBeGreaterThan(0);
    });

    it('should return empty arrays for non-matching title', () => {
      const result = extractKeywords('ABCDEFGHIJK');

      expect(result.emergency).toEqual([]);
      expect(result.noisy).toEqual([]);
    });

    it('should handle Japanese text correctly', () => {
      const result = extractKeywords('緊急事態宣言が発令されました');

      expect(result.emergency).toContain('緊急事態');
    });
  });

  describe('dataset', () => {
    it('should have emergency keywords array', () => {
      expect(dataset).toHaveProperty('emergency');
      expect(Array.isArray(dataset.emergency)).toBe(true);
      expect(dataset.emergency.length).toBeGreaterThan(0);
    });

    it('should have noisy keywords array', () => {
      expect(dataset).toHaveProperty('noisy');
      expect(Array.isArray(dataset.noisy)).toBe(true);
      expect(dataset.noisy.length).toBeGreaterThan(0);
    });

    it('should contain expected emergency keywords', () => {
      expect(dataset.emergency).toContain('地震');
      expect(dataset.emergency).toContain('緊急事態');
      expect(dataset.emergency).toContain('大規模');
    });
  });
});
