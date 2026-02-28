/**
 * Claude AI API service (Anthropic).
 *
 * API key is read from the VITE_ANTHROPIC_API_KEY environment variable.
 * Requests are proxied via Vite dev server to avoid CORS issues.
 *
 * @module aiService
 */

const MODEL = 'claude-sonnet-4-20250514';

function getApiKey() {
  return import.meta.env.VITE_ANTHROPIC_API_KEY || '';
}

/**
 * Call the Claude API with exponential backoff retry.
 *
 * @param {string} prompt            - The user message
 * @param {string} systemInstruction - System-level instruction
 * @returns {Promise<string>} The generated text response
 * @throws {Error} After all retries exhausted or if no API key
 */
export async function callClaude(prompt, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error(
      'Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.'
    );
  }

  const url = '/api/claude/v1/messages';
  const payload = {
    model: MODEL,
    max_tokens: 2048,
    system: systemInstruction,
    messages: [{ role: 'user', content: prompt }],
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  const maxAttempts = delays.length + 1;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const result = await response.json();
      return result.content?.[0]?.text || '';
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

  return callClaude(prompt, 'You are an expert portfolio manager and quantitative analyst.');
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

  return callClaude(prompt, 'You are a senior investment strategist advising a portfolio manager.');
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

  return callClaude(prompt, 'You are a senior portfolio analyst writing an investor report.');
}

/**
 * Generate a full investment committee report from multiple periods.
 */
export async function generateCommitteeReport({ periods }) {
  const periodsData = periods.map((p) => ({
    period: p.label,
    portfolioReturn: `${(p.performanceResults.portfolio.periodReturn * 100).toFixed(2)}%`,
    annualizedReturn: `${(p.performanceResults.portfolio.annualizedReturn * 100).toFixed(2)}%`,
    beginningValue: p.performanceResults.portfolio.beginningValue,
    endingValue: p.performanceResults.portfolio.endingValue,
    assetBreakdown: p.performanceResults.assetResults.map((a) => ({
      name: a.name,
      weight: `${(a.weight * 100).toFixed(1)}%`,
      return: `${(a.periodReturn * 100).toFixed(2)}%`,
      contribution: `${(a.contribution * 100).toFixed(2)}%`,
    })),
  }));

  const prompt = `Generate a comprehensive Investment Committee Report based on the following multi-period portfolio performance data.

PERIODS:
${JSON.stringify(periodsData, null, 2)}

Structure the report as follows:
1. EXECUTIVE SUMMARY (2-3 paragraphs): High-level overview of portfolio performance across all periods, key trends, and whether performance is improving or deteriorating.
2. PERFORMANCE ANALYSIS (2-3 paragraphs): Detailed analysis of returns by period, highlighting best and worst performing asset classes, and the drivers of performance.
3. RISK & ALLOCATION COMMENTARY (1-2 paragraphs): Commentary on asset allocation shifts, concentration risks, and how allocation decisions impacted returns.
4. OUTLOOK & RECOMMENDATIONS (3-5 bullet points): Forward-looking strategic recommendations for the investment committee.

Make it professional, data-driven, and suitable for a board-level investment committee presentation. Reference specific numbers from the data.`;

  return callClaude(
    prompt,
    'You are a Chief Investment Officer preparing a formal report for the Investment Committee. Write in a professional, authoritative tone with specific data references. Use markdown formatting for headers and bullet points.'
  );
}
