/**
 * Gemini AI API service.
 *
 * API key is read from the VITE_GEMINI_API_KEY environment variable.
 * Falls back gracefully if the key is not set.
 *
 * @module geminiService
 */

const MODEL = 'gemini-2.0-flash';

function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Call the Gemini API with exponential backoff retry.
 *
 * @param {string} prompt            - The user prompt
 * @param {string} systemInstruction - System-level instruction
 * @returns {Promise<string>} The generated text response
 * @throws {Error} After all retries exhausted or if no API key
 */
export async function callGemini(prompt, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  const maxAttempts = delays.length + 1;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await new Promise((res) => setTimeout(res, delays[i]));
    }
  }
}

/**
 * Generate an executive summary from attribution data.
 */
export async function generateExecutiveSummary({ activeReturn, totalAllocation, totalSelection, assetBreakdown }) {
  const stats = JSON.stringify(assetBreakdown);

  const prompt = `Write a 2-paragraph executive summary of the following portfolio performance attribution data (Brinson-Fachler method).

Total Active Return: ${(activeReturn * 100).toFixed(2)}%
Total Allocation Effect: ${(totalAllocation * 100).toFixed(2)}%
Total Selection Effect: ${(totalSelection * 100).toFixed(2)}%

Asset Class Breakdown:
${stats}

Make it professional, suitable for a client report. Highlight the biggest winners and losers without being overly verbose.`;

  return callGemini(prompt, 'You are an expert portfolio manager and quantitative analyst.');
}

/**
 * Generate strategic recommendations from attribution data.
 */
export async function generateRecommendations({ activeReturn, assetBreakdown }) {
  const stats = JSON.stringify(assetBreakdown);

  const prompt = `Based on the following Brinson-Fachler attribution data, provide 3 bullet points of strategic, actionable recommendations for the portfolio manager.

Total Active Return: ${(activeReturn * 100).toFixed(2)}%
Asset Breakdown:
${stats}

Focus on whether they should improve asset allocation timing, security selection, or reconsider weighting in specific classes. Keep it concise.`;

  return callGemini(prompt, 'You are a senior investment strategist advising a portfolio manager.');
}

/**
 * Generate performance measurement commentary.
 */
export async function generatePerformanceCommentary({ portfolioReturn, annualizedReturn, assetResults }) {
  const stats = JSON.stringify(
    assetResults.map((a) => ({
      AssetClass: a.name,
      Weight: `${(a.weight * 100).toFixed(1)}%`,
      PeriodReturn: `${(a.periodReturn * 100).toFixed(2)}%`,
      Contribution: `${(a.contribution * 100).toFixed(2)}%`,
    }))
  );

  const prompt = `Write a concise 2-paragraph performance commentary for this portfolio.

Portfolio Period Return: ${(portfolioReturn * 100).toFixed(2)}%
Annualized Return: ${(annualizedReturn * 100).toFixed(2)}%

Asset Class Results:
${stats}

Make it professional and suitable for an investor report. Note which asset classes drove performance and any areas of concern.`;

  return callGemini(prompt, 'You are a senior portfolio analyst writing an investor report.');
}
