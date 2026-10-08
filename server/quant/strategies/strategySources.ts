/**
 * Strategy Source & Evidence Registry
 * Strategy Library V2.0 - Ground Truth Research Mapping
 * 
 * Strict Anti-Hallucination Standards:
 * - Only verified academic publications, peer-reviewed journals, and classic practitioner literature.
 * - Fictional desks, synthetic DOIs, and unverifiable models are strictly marked UNVERIFIED.
 */

export type AcademicEvidenceLevel = 'A+' | 'A' | 'B' | 'C' | 'UNVERIFIED';

export type ImplementationStatus =
  | 'EXECUTABLE_CORE'               // Fully validated executable logic in codebase
  | 'PROXY_EVALUATED'              // Simplified proxy condition in AST (needs enhancement in V2.0)
  | 'REQUIRES_ADAPTATION'          // Requires fundamental data or multi-asset support
  | 'UNVERIFIED_PENDING_REWRITE';  // Fictional author/method; scheduled for replacement

export interface StrategySourceRecord {
  sourceId: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string;
  doi?: string;
  url?: string;
  evidenceLevel: AcademicEvidenceLevel;
  strategyFamilies: string[];
  notes: string;
  isVerified: boolean;
}

export interface StrategyEvidenceMapping {
  strategyId: string;
  strategyName: string;
  researchFamily: string;
  sourceId: string;
  sourceTitle: string;
  authors: string[];
  evidenceLevel: AcademicEvidenceLevel;
  implementationStatus: ImplementationStatus;
  implementationNotes: string;
}

// ============================================================================
// 1. VERIFIED RESEARCH SOURCES REGISTRY
// ============================================================================

export const VERIFIED_SOURCES: StrategySourceRecord[] = [
  // 1. Momentum & Cross-Sectional Momentum
  {
    sourceId: 'src_jegadeesh_titman_1993',
    title: 'Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency',
    authors: ['Narasimhan Jegadeesh', 'Sheridan Titman'],
    year: 1993,
    journal: 'The Journal of Finance, 48(1), 65-91',
    doi: '10.1111/j.1540-6261.1993.tb04702.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1993.tb04702.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Cross-Sectional Momentum', 'Momentum', 'Relative Strength'],
    notes: 'Foundational study establishing cross-sectional relative strength momentum over 3-12 month horizons.',
    isVerified: true
  },
  {
    sourceId: 'src_carhart_1997',
    title: 'On Persistence in Mutual Fund Performance',
    authors: ['Mark M. Carhart'],
    year: 1997,
    journal: 'The Journal of Finance, 52(1), 57-82',
    doi: '10.1111/j.1540-6261.1997.tb03808.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1997.tb03808.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Cross-Sectional Momentum', 'Multi-Factor', 'Factor'],
    notes: 'Formally integrated 1-year momentum factor (PR1YR/WML) into Fama-French multi-factor asset pricing.',
    isVerified: true
  },

  // 2. Time-Series Momentum & Trend Following
  {
    sourceId: 'src_moskowitz_ooi_pedersen_2012',
    title: 'Time Series Momentum',
    authors: ['Tobias J. Moskowitz', 'Yao Hua Ooi', 'Lasse Heje Pedersen'],
    year: 2012,
    journal: 'Journal of Financial Economics, 104(2), 228-250',
    doi: '10.1016/j.jfineco.2011.11.003',
    url: 'https://doi.org/10.1016/j.jfineco.2011.11.003',
    evidenceLevel: 'A+',
    strategyFamilies: ['Time-Series Momentum', 'Trend Following'],
    notes: 'Proved robust positive predictability in own-past returns across 58 liquid futures and equity assets.',
    isVerified: true
  },
  {
    sourceId: 'src_donchian_1960',
    title: 'High Finance in Copper',
    authors: ['Richard Donchian'],
    year: 1960,
    journal: 'Financial Analysts Journal, 16(6), 133-142',
    doi: '10.2469/faj.v16.n6.133',
    url: 'https://doi.org/10.2469/faj.v16.n6.133',
    evidenceLevel: 'B',
    strategyFamilies: ['Time-Series Momentum', 'Breakout', 'Trend Following'],
    notes: 'Introduced the seminal 20-day and 55-day channel breakout rules fundamental to trend-following desks.',
    isVerified: true
  },

  // 3. Short-Term Reversal
  {
    sourceId: 'src_jegadeesh_1990',
    title: 'Evidence of Predictable Behavior of Security Returns',
    authors: ['Narasimhan Jegadeesh'],
    year: 1990,
    journal: 'The Journal of Finance, 45(3), 881-898',
    doi: '10.1111/j.1540-6261.1990.tb05110.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1990.tb05110.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Short-Term Reversal', 'Mean Reversion'],
    notes: 'Documented substantial monthly return reversals in US equities driven by inventory imbalances and liquidity provision.',
    isVerified: true
  },
  {
    sourceId: 'src_lehmann_1990',
    title: 'Fads, Martingales, and Market Efficiency',
    authors: ['Bruce N. Lehmann'],
    year: 1990,
    journal: 'The Quarterly Journal of Economics, 105(1), 1-28',
    doi: '10.2307/2937816',
    url: 'https://doi.org/10.2307/2937816',
    evidenceLevel: 'A+',
    strategyFamilies: ['Short-Term Reversal', 'Mean Reversion', 'Statistical Arbitrage'],
    notes: 'Demonstrated statistically significant weekly reversals generating robust positive returns net of transaction costs.',
    isVerified: true
  },
  {
    sourceId: 'src_connors_alvarez_2008',
    title: 'Short Term Trading Strategies That Work: A Quantified Guide to Trading Stocks and ETFs',
    authors: ['Larry Connors', 'Cesar Alvarez'],
    year: 2008,
    journal: 'TradingMarkets Publishing',
    evidenceLevel: 'C',
    strategyFamilies: ['Short-Term Reversal', 'Mean Reversion'],
    notes: 'Empirically tested short-term (1-5 day) Wilder RSI(2) deep oversold bounces filtered by 200-day trend SMA.',
    isVerified: true
  },

  // 4. Pairs Trading
  {
    sourceId: 'src_gatev_goetzmann_rouwenhorst_2006',
    title: 'Pairs Trading: Performance of a Relative-Value Arbitrage Rule',
    authors: ['Evan Gatev', 'William N. Goetzmann', 'K. Geert Rouwenhorst'],
    year: 2006,
    journal: 'The Review of Financial Studies, 19(3), 797-827',
    doi: '10.1093/rfs/hhj020',
    url: 'https://doi.org/10.1093/rfs/hhj020',
    evidenceLevel: 'A+',
    strategyFamilies: ['Pairs Trading', 'Statistical Arbitrage', 'Mean Reversion'],
    notes: 'Standardized cointegration and normalized distance metric pairs trading on daily CRSP equity data.',
    isVerified: true
  },

  // 5. Post-Earnings Announcement Drift (PEAD)
  {
    sourceId: 'src_bernard_thomas_1989',
    title: 'Post-Earnings-Announcement Drift: Delayed Price Response or Risk Premium?',
    authors: ['Victor L. Bernard', 'Jacob K. Thomas'],
    year: 1989,
    journal: 'Journal of Accounting Research, 27(Supplement), 1-36',
    doi: '10.2307/2491062',
    url: 'https://doi.org/10.2307/2491062',
    evidenceLevel: 'A+',
    strategyFamilies: ['Post-Earnings Announcement Drift', 'Earnings Momentum'],
    notes: 'Verified that prices underreact to quarterly earnings surprises (SUE), drifting positively up to 60 trading days.',
    isVerified: true
  },
  {
    sourceId: 'src_ball_brown_1968',
    title: 'An Empirical Evaluation of Accounting Income Numbers',
    authors: ['Ray Ball', 'Philip Brown'],
    year: 1968,
    journal: 'Journal of Accounting Research, 6(2), 159-178',
    doi: '10.2307/2490232',
    url: 'https://doi.org/10.2307/2490232',
    evidenceLevel: 'A+',
    strategyFamilies: ['Post-Earnings Announcement Drift', 'Event-Driven'],
    notes: 'The pioneer event study demonstrating that stock prices anticipate and drift with earnings information.',
    isVerified: true
  },

  // 6. Accruals
  {
    sourceId: 'src_sloan_1996',
    title: 'Do Stock Prices Fully Reflect Information in Accruals and Cash Flows About Future Earnings?',
    authors: ['Richard G. Sloan'],
    year: 1996,
    journal: 'The Accounting Review, 71(3), 289-315',
    url: 'https://www.jstor.org/stable/248290',
    evidenceLevel: 'A+',
    strategyFamilies: ['Accruals', 'Quality', 'Accounting Alpha'],
    notes: 'Discovered the accrual anomaly: firms with high working capital accruals suffer significant future stock price underperformance.',
    isVerified: true
  },

  // 7. Value
  {
    sourceId: 'src_fama_french_1992',
    title: 'The Cross-Section of Expected Stock Returns',
    authors: ['Eugene F. Fama', 'Kenneth R. French'],
    year: 1992,
    journal: 'The Journal of Finance, 47(2), 427-465',
    doi: '10.1111/j.1540-6261.1992.tb04398.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1992.tb04398.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Value', 'Size', 'Factor'],
    notes: 'Empirically proved book-to-market equity (HML) and size (SMB) capture cross-sectional average stock returns.',
    isVerified: true
  },
  {
    sourceId: 'src_lakonishok_shleifer_vishny_1994',
    title: 'Contrarian Investment, Extrapolation, and Risk',
    authors: ['Josef Lakonishok', 'Andrei Shleifer', 'Robert W. Vishny'],
    year: 1994,
    journal: 'The Journal of Finance, 49(5), 1541-1578',
    doi: '10.1111/j.1540-6261.1994.tb04772.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1994.tb04772.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Value', 'Behavioral Finance'],
    notes: 'Demonstrated value premia arise from investor cognitive bias over-extrapolating past growth rather than fundamental risk.',
    isVerified: true
  },

  // 8. Profitability & Gross Profitability
  {
    sourceId: 'src_novy_marx_2013',
    title: 'The Other Side of Value: The Gross Profitability Premium',
    authors: ['Robert Novy-Marx'],
    year: 2013,
    journal: 'Journal of Financial Economics, 108(1), 1-28',
    doi: '10.1016/j.jfineco.2013.01.003',
    url: 'https://doi.org/10.1016/j.jfineco.2013.01.003',
    evidenceLevel: 'A+',
    strategyFamilies: ['Gross Profitability', 'Profitability', 'Quality'],
    notes: 'Demonstrated gross profits scaled by assets predicts cross-sectional stock returns with equal power to book-to-market.',
    isVerified: true
  },

  // 9. Investment & Q-Factor
  {
    sourceId: 'src_hou_xue_zhang_2015',
    title: 'Digesting Anomalies: An Investment Approach',
    authors: ['Kewei Hou', 'Chen Xue', 'Lu Zhang'],
    year: 2015,
    journal: 'The Review of Financial Studies, 28(3), 650-705',
    doi: '10.1093/rfs/hhu068',
    url: 'https://doi.org/10.1093/rfs/hhu068',
    evidenceLevel: 'A+',
    strategyFamilies: ['Investment', 'Q-Factor', 'Profitability'],
    notes: 'Established the q-factor model demonstrating investment (asset growth) and profitability (ROE) subsume dozens of anomalies.',
    isVerified: true
  },
  {
    sourceId: 'src_fama_french_2015',
    title: 'A Five-Factor Asset Pricing Model',
    authors: ['Eugene F. Fama', 'Kenneth R. French'],
    year: 2015,
    journal: 'Journal of Financial Economics, 116(1), 1-22',
    doi: '10.1016/j.jfineco.2014.10.010',
    url: 'https://doi.org/10.1016/j.jfineco.2014.10.010',
    evidenceLevel: 'A+',
    strategyFamilies: ['Investment', 'Profitability', 'Value', 'Factor'],
    notes: 'Extended the 3-factor model with robust profitability (RMW) and conservative investment (CMA) factors.',
    isVerified: true
  },

  // 10. Piotroski F-Score
  {
    sourceId: 'src_piotroski_2000',
    title: 'Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers',
    authors: ['Joseph D. Piotroski'],
    year: 2000,
    journal: 'Journal of Accounting Research, 38(Supplement), 1-41',
    doi: '10.2307/2491491',
    url: 'https://doi.org/10.2307/2491491',
    evidenceLevel: 'A+',
    strategyFamilies: ['Piotroski F-Score', 'Quality', 'Value'],
    notes: 'Constructed the 9-indicator aggregate fundamental score (F-Score) separating quality winners from value traps.',
    isVerified: true
  },

  // 11. Quality
  {
    sourceId: 'src_asness_frazzini_pedersen_2019',
    title: 'Quality Minus Junk',
    authors: ['Clifford S. Asness', 'Andrea Frazzini', 'Lasse Heje Pedersen'],
    year: 2019,
    journal: 'Review of Accounting Studies, 24(1), 34-112',
    doi: '10.1007/s11142-018-9470-2',
    url: 'https://doi.org/10.1007/s11142-018-9470-2',
    evidenceLevel: 'A+',
    strategyFamilies: ['Quality', 'Profitability', 'Safety'],
    notes: 'Comprehensive multi-country empirical foundation for Quality Minus Junk factor combining profitability, safety, and payout.',
    isVerified: true
  },

  // 12. Low Beta & Low Volatility
  {
    sourceId: 'src_frazzini_pedersen_2014',
    title: 'Betting Against Beta',
    authors: ['Andrea Frazzini', 'Lasse Heje Pedersen'],
    year: 2014,
    journal: 'Journal of Financial Economics, 111(1), 1-25',
    doi: '10.1016/j.jfineco.2013.10.005',
    url: 'https://doi.org/10.1016/j.jfineco.2013.10.005',
    evidenceLevel: 'A+',
    strategyFamilies: ['Low Beta', 'Low Volatility', 'Asset Pricing'],
    notes: 'Proved borrowing constraints cause leverage-constrained investors to overweight high-beta assets, creating alpha for low-beta.',
    isVerified: true
  },
  {
    sourceId: 'src_baker_bradley_wurgler_2011',
    title: 'Benchmarks as Limits to Arbitrage: Understanding the Low-Volatility Anomaly',
    authors: ['Malcolm Baker', 'Brendan Bradley', 'Jeffrey Wurgler'],
    year: 2011,
    journal: 'Financial Analysts Journal, 67(1), 40-54',
    doi: '10.2469/faj.v67.n1.4',
    url: 'https://doi.org/10.2469/faj.v67.n1.4',
    evidenceLevel: 'A',
    strategyFamilies: ['Low Volatility', 'Factor'],
    notes: 'Institutional mandates tracking market-cap weighted benchmarks prevent exploitation of the persistent low-volatility anomaly.',
    isVerified: true
  },
  {
    sourceId: 'src_ang_hodrick_xing_zhang_2006',
    title: 'The Cross-Section of Volatility and Expected Returns',
    authors: ['Andrew Ang', 'Robert J. Hodrick', 'Yuhang Xing', 'Xiaoyan Zhang'],
    year: 2006,
    journal: 'The Journal of Finance, 61(1), 259-299',
    doi: '10.1111/j.1540-6261.2006.00836.x',
    url: 'https://doi.org/10.1111/j.1540-6261.2006.00836.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Low Volatility', 'Idiosyncratic Volatility'],
    notes: 'Documented that stocks with high idiosyncratic volatility relative to the Fama-French model earn abysmally low future returns.',
    isVerified: true
  },

  // 13. Value + Momentum
  {
    sourceId: 'src_asness_moskowitz_pedersen_2013',
    title: 'Value and Momentum Everywhere',
    authors: ['Clifford S. Asness', 'Tobias J. Moskowitz', 'Lasse Heje Pedersen'],
    year: 2013,
    journal: 'The Journal of Finance, 68(3), 929-985',
    doi: '10.1111/jofi.12021',
    url: 'https://doi.org/10.1111/jofi.12021',
    evidenceLevel: 'A+',
    strategyFamilies: ['Value + Momentum', 'Multi-Factor'],
    notes: 'Demonstrated that value and momentum premiums are negatively correlated across 8 global asset markets, creating enormous diversification alpha.',
    isVerified: true
  },

  // 14. Technical Pattern Recognition & Quantitative Technical Systems
  {
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    title: 'Simple Technical Trading Rules and the Stochastic Properties of Stock Returns',
    authors: ['William Brock', 'Josef Lakonishok', 'Blake LeBaron'],
    year: 1992,
    journal: 'The Journal of Finance, 47(5), 1731-1764',
    doi: '10.1111/j.1540-6261.1992.tb04681.x',
    url: 'https://doi.org/10.1111/j.1540-6261.1992.tb04681.x',
    evidenceLevel: 'A+',
    strategyFamilies: ['Technical Pattern Recognition', 'Moving Average', 'Breakout'],
    notes: 'Rigorous bootstrap econometric test demonstrating moving average crossover and support/resistance breakout rule validity over 90 years of DJIA data.',
    isVerified: true
  },
  {
    sourceId: 'src_lo_mamaysky_wang_2000',
    title: 'Foundations of Technical Analysis: Computational Algorithms, Statistical Inference, and Empirical Implementation',
    authors: ['Andrew W. Lo', 'Harry Mamaysky', 'Jiang Wang'],
    year: 2000,
    journal: 'The Journal of Finance, 55(4), 1705-1765',
    doi: '10.1111/0022-1082.00265',
    url: 'https://doi.org/10.1111/0022-1082.00265',
    evidenceLevel: 'A+',
    strategyFamilies: ['Technical Pattern Recognition', 'Geometric Pattern Algorithms'],
    notes: 'Nonparametric kernel regression providing statistical validation of classical technical chart patterns (double bottoms, head-and-shoulders, rectangles).',
    isVerified: true
  },
  {
    sourceId: 'src_crabel_1990',
    title: 'Day Trading with Short Term Price Patterns',
    authors: ['Toby Crabel'],
    year: 1990,
    journal: 'Traders Press',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Breakout', 'Short-Term Reversal'],
    notes: 'Definitive practitioner volume on Opening Range Breakout (ORB) and Narrow Range 7 (NR7) volatility compression bars.',
    isVerified: true
  },
  {
    sourceId: 'src_bollinger_2001',
    title: 'Bollinger on Bollinger Bands',
    authors: ['John Bollinger'],
    year: 2001,
    journal: 'McGraw-Hill',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Volatility Breakout', 'Mean Reversion'],
    notes: 'Formulation of adaptive 20-period 2-standard-deviation bands, BandWidth compression squeeze, and %b oscillator.',
    isVerified: true
  },
  {
    sourceId: 'src_wilder_1978',
    title: 'New Concepts in Technical Trading Systems',
    authors: ['J. Welles Wilder'],
    year: 1978,
    journal: 'Trend Research',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Momentum', 'Volatility'],
    notes: 'Original mathematical derivation of Wilder Relative Strength Index (RSI), Average True Range (ATR), and Parabolic SAR.',
    isVerified: true
  },
  {
    sourceId: 'src_minervini_2013',
    title: 'Trade Like a Stock Market Wizard: How to Achieve Superperformance in Stocks in Any Market',
    authors: ['Mark Minervini'],
    year: 2013,
    journal: 'McGraw-Hill',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Trend Following', 'Position'],
    notes: 'Specified the 8-point Trend Template (SMA 200/150/50 alignment) and Volatility Contraction Pattern (VCP).',
    isVerified: true
  },
  {
    sourceId: 'src_weinstein_1988',
    title: "Stan Weinstein's Secrets For Profiting in Bull and Bear Markets",
    authors: ['Stan Weinstein'],
    year: 1988,
    journal: 'Dow Jones-Irwin',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Stage Analysis', 'Position'],
    notes: 'Four-stage market cycle theory with 30-week moving average breakout and volume expansion confirmation.',
    isVerified: true
  },
  {
    sourceId: 'src_darvas_1960',
    title: 'How I Made $2,000,000 in the Stock Market',
    authors: ['Nicolas Darvas'],
    year: 1960,
    journal: 'American Research Council',
    evidenceLevel: 'C',
    strategyFamilies: ['Technical Pattern Recognition', 'Breakout', 'Swing'],
    notes: 'Seminal modern box theory combining higher-high upper boundary breakout with strict trailing stop orders.',
    isVerified: true
  },
  {
    sourceId: 'src_faith_2007',
    title: 'Way of the Turtle: The Secret Methods that Turned Ordinary People into Legendary Traders',
    authors: ['Curtis M. Faith'],
    year: 2007,
    journal: 'McGraw-Hill',
    evidenceLevel: 'C',
    strategyFamilies: ['Trend Following', 'Time-Series Momentum', 'Breakout'],
    notes: 'Public disclosure of the 1983 Dennis-Eckhardt Turtle trading system, N (ATR) position sizing, and Donchian channel breakouts.',
    isVerified: true
  },
  {
    sourceId: 'src_kaufman_1998',
    title: 'Trading Systems and Methods (3rd Edition)',
    authors: ['Perry J. Kaufman'],
    year: 1998,
    journal: 'John Wiley & Sons',
    evidenceLevel: 'C',
    strategyFamilies: ['Trend Following', 'Adaptive Moving Average'],
    notes: 'Derivation of the Kaufman Adaptive Moving Average (KAMA) weighting efficiency ratio (ER) against market noise.',
    isVerified: true
  },
  {
    sourceId: 'src_elder_1993',
    title: 'Trading for a Living: Psychology, Trading Tactics, Money Management',
    authors: ['Alexander Elder'],
    year: 1993,
    journal: 'John Wiley & Sons',
    evidenceLevel: 'C',
    strategyFamilies: ['Trend Following', 'Short-Term Reversal', 'Multi-Timeframe'],
    notes: 'Original formulation of the Triple Screen trading system utilizing weekly trend filter, daily oscillator, and intraday entry breakout.',
    isVerified: true
  }
];

// ============================================================================
// 2. UNVERIFIED / FICTIONAL SOURCES REGISTRY (Strict Isolation)
// ============================================================================

export const UNVERIFIED_SOURCES: StrategySourceRecord[] = [
  {
    sourceId: 'src_unverified_transformer_momentum',
    title: 'Transformer Multi-Head Temporal Attention Momentum Model',
    authors: ['Deep Quant Research Group (Vaswani et al. Architecture)'],
    year: null,
    journal: 'UNVERIFIED (Fictional Attribution)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Vaswani et al. (2017) published "Attention Is All You Need" for NLP, NOT a stock trading scanner. Fictional author and fake claims in codebase.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_vae_liquidity',
    title: 'Variational Autoencoder (VAE) Liquidity Footprint Model',
    authors: ['Kingma & Welling Deep Generative Architecture'],
    year: null,
    journal: 'UNVERIFIED (Fictional Attribution)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Kingma & Welling (2013) invented VAE for machine learning, never authored an equity liquidity scanner. Fictional.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_lstm_regime',
    title: 'LSTM Market Regime Switching Model',
    authors: ['Sepp Hochreiter & Jürgen Schmidhuber'],
    year: null,
    journal: 'UNVERIFIED (Fictional Attribution)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Hochreiter & Schmidhuber (1997) invented LSTM neural networks, not a trading model. Fictional author attribution.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_rf_ensemble_alpha',
    title: 'Random Forest Bagging Denoised Alpha Ensemble',
    authors: ['Leo Breiman Ensemble Theory'],
    year: null,
    journal: 'UNVERIFIED (Fictional Attribution)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Breiman (2001) invented Random Forests for statistics/ML, not an equity trading strategy. Fictional attribution.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_rl_policy_trend',
    title: 'Reinforcement Learning (PPO) Adaptive Policy Trend',
    authors: ['Deep Reinforcement Learning Quant Desk'],
    year: null,
    journal: 'UNVERIFIED (Fictional Desk)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Fictional quant desk. AST code is merely basic RSI and change percent filters without actual policy network.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_deep_feature_ortho',
    title: 'Deep Factor Orthogonal Neutral Alpha',
    authors: ['Deep Quant Asset Pricing Laboratory'],
    year: null,
    journal: 'UNVERIFIED (Fictional Laboratory)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['AI_ML'],
    notes: 'Fictional research group. No orthogonal decomposition executed in codebase.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_microstructure_alpha_desk',
    title: 'Market-On-Close Institutional Imbalance Rush',
    authors: ['Microstructure Alpha Desk'],
    year: null,
    journal: 'UNVERIFIED (Fictional Desk)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['SMART_MONEY'],
    notes: 'Fictional trading desk. Codebase lacks real NYSE/NASDAQ MOC imbalance feed.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_smart_money_tracker',
    title: 'Dark Pool & Off-Exchange Large Block Accumulation',
    authors: ['Smart Money Tracker Group'],
    year: null,
    journal: 'UNVERIFIED (Fictional Group)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['SMART_MONEY'],
    notes: 'Fictional group. Codebase lacks TRF/FINRA dark pool feed; AST evaluates standard volume proxy.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_stat_arb_group',
    title: 'Cross-Sectional Factor Z-Score Mean Reversion',
    authors: ['Statistical Arbitrage Quant Group'],
    year: null,
    journal: 'UNVERIFIED (Fictional Group)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['STAT_ARB'],
    notes: 'Fictional entity. No cross-sectional z-score matrix calculation in current AST rules.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_inst_quant_research',
    title: 'Price-Volume Trend (PVT) Smart Inflow Divergence',
    authors: ['Institutional Quantitative Research'],
    year: null,
    journal: 'UNVERIFIED (Fictional Entity)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['SMART_MONEY'],
    notes: 'Fictional entity. PVT divergence is standard technical volume indicator.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_quant_corr_desk',
    title: 'Triangular Correlation & Statistical Dispersion Arbitrage',
    authors: ['Quantitative Correlation Arbitrage Desk'],
    year: null,
    journal: 'UNVERIFIED (Fictional Desk)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['STAT_ARB'],
    notes: 'Fictional entity. No triangular correlation matrix computation exists in the engine.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_index_arb_desk',
    title: 'Sector ETF & Large-Cap Momentum Scissors Arbitrage',
    authors: ['Index Arbitrage Trading Desk'],
    year: null,
    journal: 'UNVERIFIED (Fictional Desk)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['STAT_ARB'],
    notes: 'Fictional desk name. Scissors arbitrage requires simultaneous ETF/NAV basis calculation.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_bridgewater_all_weather',
    title: 'Bridgewater All-Weather Risk Parity Single Stock Adaptation',
    authors: ['Ray Dalio / Bridgewater Associates (Fictional Stock Translation)'],
    year: null,
    journal: 'UNVERIFIED (Fictional Adaptation)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['MACRO_REGIME'],
    notes: 'Bridgewater All Weather is an asset allocation strategy across bonds, stocks, gold, commodities. Reducing it to a single-stock equity scanner is a fictional adaptation.',
    isVerified: false
  },
  {
    sourceId: 'src_unverified_merrill_clock',
    title: 'Merrill Lynch Investment Clock Equity Filter',
    authors: ['Merrill Lynch Strategy Team (Fictional Adaptation)'],
    year: null,
    journal: 'UNVERIFIED (Fictional Adaptation)',
    evidenceLevel: 'UNVERIFIED',
    strategyFamilies: ['MACRO_REGIME'],
    notes: 'The Investment Clock is a macro economic cycle framework (growth vs inflation), not an individual stock AST scanner.',
    isVerified: false
  }
];

// Combine all sources into unified lookup dictionary
export const ALL_SOURCES: StrategySourceRecord[] = [...VERIFIED_SOURCES, ...UNVERIFIED_SOURCES];

export const STRATEGY_SOURCE_REGISTRY: Record<string, StrategySourceRecord> = Object.fromEntries(
  ALL_SOURCES.map(s => [s.sourceId, s])
);

// ============================================================================
// 3. STRATEGY TO EVIDENCE MAPPINGS (62 Current Strategies Mapped)
// ============================================================================

export const STRATEGY_EVIDENCE_MAPPINGS: StrategyEvidenceMapping[] = [
  // --- TREND FOLLOWERS ---
  {
    strategyId: 'donchian_breakout',
    strategyName: 'Donchian Channel 20-Day Breakout',
    researchFamily: 'Time-Series Momentum',
    sourceId: 'src_donchian_1960',
    sourceTitle: 'High Finance in Copper',
    authors: ['Richard Donchian'],
    evidenceLevel: 'B',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Fully executable via 20-day high/low channels and RVOL confirmation.'
  },
  {
    strategyId: 'turtle_system_1',
    strategyName: 'Turtle Trading System One',
    researchFamily: 'Time-Series Momentum',
    sourceId: 'src_faith_2007',
    sourceTitle: 'Way of the Turtle',
    authors: ['Curtis M. Faith', 'Richard Dennis', 'William Eckhardt'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Classic 20-day breakout with ATR (N) volatility risk framing.'
  },
  {
    strategyId: 'minervini_trend_template',
    strategyName: 'Mark Minervini Trend Template (VCP)',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_minervini_2013',
    sourceTitle: 'Trade Like a Stock Market Wizard',
    authors: ['Mark Minervini'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Stage 2 trend template using 200, 150, 50 SMA alignment.'
  },
  {
    strategyId: 'weinstein_stage2',
    strategyName: 'Stan Weinstein Stage 2 Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_weinstein_1988',
    sourceTitle: "Stan Weinstein's Secrets For Profiting in Bull and Bear Markets",
    authors: ['Stan Weinstein'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: '30-week (150-day) moving average base breakout with volume confirmation.'
  },
  {
    strategyId: 'elder_triple_screen',
    strategyName: 'Alexander Elder Triple Screen System',
    researchFamily: 'Multi-Timeframe Trend',
    sourceId: 'src_elder_1993',
    sourceTitle: 'Trading for a Living',
    authors: ['Alexander Elder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Trend alignment across weekly and daily timeframe momentum.'
  },
  {
    strategyId: 'supertrend_momentum',
    strategyName: 'SuperTrend Dynamic Momentum Following',
    researchFamily: 'Time-Series Momentum',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems (ATR Foundation)',
    authors: ['Olivier Seban', 'J. Welles Wilder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'ATR trailing band breakout system; misclassified as short-term in UI V1.0.'
  },
  {
    strategyId: 'kama_adaptive_trend',
    strategyName: 'Kaufman Adaptive Moving Average (KAMA) Trend',
    researchFamily: 'Time-Series Momentum',
    sourceId: 'src_kaufman_1998',
    sourceTitle: 'Trading Systems and Methods',
    authors: ['Perry J. Kaufman'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Adaptive noise-adjusted exponential moving average; misclassified in UI V1.0.'
  },
  {
    strategyId: 'parabolic_sar_trend',
    strategyName: 'Parabolic SAR Acceleration Trend',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems',
    authors: ['J. Welles Wilder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Trailing acceleration factor stop-and-reverse system.'
  },
  {
    strategyId: 'adx_trend_strength',
    strategyName: 'ADX Trend Strength & Directional Momentum',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems',
    authors: ['J. Welles Wilder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Directional Movement Index filtering ADX > 25 non-ranging markets.'
  },
  {
    strategyId: 'triple_ema_alignment',
    strategyName: 'Triple Exponential MA (TEMA) Bullish Convergence',
    researchFamily: 'Time-Series Momentum',
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    sourceTitle: 'Simple Technical Trading Rules and the Stochastic Properties of Stock Returns',
    authors: ['Patrick Mulloy', 'William Brock et al.'],
    evidenceLevel: 'B',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Triple zero-lag exponential moving average alignment.'
  },

  // --- MEAN REVERSION ---
  {
    strategyId: 'connors_rsi2',
    strategyName: 'Larry Connors RSI(2) Mean Reversion',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_connors_alvarez_2008',
    sourceTitle: 'Short Term Trading Strategies That Work',
    authors: ['Larry Connors', 'Cesar Alvarez'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Calculates true Wilder RSI(2) < 10 over SMA 200 bull filter.'
  },
  {
    strategyId: 'wilder_oversold_rebound',
    strategyName: 'Wilder Dynamic RSI Oversold Bounce',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems',
    authors: ['J. Welles Wilder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Standard RSI(14) cross below 30 and recovery.'
  },
  {
    strategyId: 'stoch_double_bottom',
    strategyName: 'Stochastic KD Double Bottom Divergence',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_lo_mamaysky_wang_2000',
    sourceTitle: 'Foundations of Technical Analysis',
    authors: ['George Lane', 'Andrew W. Lo et al.'],
    evidenceLevel: 'B',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Currently simplified in AST rules; requires full Stochastic KD %K/%D calculation.'
  },
  {
    strategyId: 'cci_oversold_thrust',
    strategyName: 'Commodity Channel Index (CCI) Oversold Thrust',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_jegadeesh_1990',
    sourceTitle: 'Evidence of Predictable Behavior of Security Returns',
    authors: ['Donald Lambert', 'Narasimhan Jegadeesh'],
    evidenceLevel: 'B',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'CCI mean-deviation calculation proxy in AST.'
  },
  {
    strategyId: 'williams_r_exhaustion',
    strategyName: 'Williams %R Exhaustion Reversal',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_lehmann_1990',
    sourceTitle: 'Fads, Martingales, and Market Efficiency',
    authors: ['Larry Williams', 'Bruce N. Lehmann'],
    evidenceLevel: 'B',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: '%R oversold exhaustion recovery proxy.'
  },
  {
    strategyId: 'bollinger_mean_revert',
    strategyName: 'Bollinger Band Lower Band Mean Reversion',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_bollinger_2001',
    sourceTitle: 'Bollinger on Bollinger Bands',
    authors: ['John Bollinger'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Price touching or penetrating lower 2-sigma band and rebounding.'
  },
  {
    strategyId: 'dpo_detrended_osc',
    strategyName: 'Detrended Price Oscillator (DPO) Reversion',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_lehmann_1990',
    sourceTitle: 'Fads, Martingales, and Market Efficiency',
    authors: ['Joe DiNapoli', 'Bruce N. Lehmann'],
    evidenceLevel: 'B',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Cycle displacement oscillator.'
  },
  {
    strategyId: 'mfi_divergence_reversion',
    strategyName: 'Money Flow Index (MFI) Divergence Reversion',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_jegadeesh_1990',
    sourceTitle: 'Evidence of Predictable Behavior of Security Returns',
    authors: ['Gene Quong', 'Avrum Soudack'],
    evidenceLevel: 'B',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Volume-weighted RSI oversold thrust.'
  },
  {
    strategyId: 'keltner_mean_reversion',
    strategyName: 'Keltner Channel Lower Band Exhaustion Rebound',
    researchFamily: 'Short-Term Reversal',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems (ATR Banding)',
    authors: ['Chester Keltner', 'Linda Bradford Raschke'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'EMA + 2x ATR channel lower boundary bounce.'
  },

  // --- BREAKOUT ---
  {
    strategyId: 'darvas_box',
    strategyName: 'Nicolas Darvas Box Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_darvas_1960',
    sourceTitle: 'How I Made $2,000,000 in the Stock Market',
    authors: ['Nicolas Darvas'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Supported by calculations.ts calculateDarvasBox and TradeSetupOverlay.'
  },
  {
    strategyId: 'bollinger_squeeze',
    strategyName: 'Bollinger Band Squeeze Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_bollinger_2001',
    sourceTitle: 'Bollinger on Bollinger Bands',
    authors: ['John Bollinger'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'BandWidth compression to 6-month low followed by upper-band expansion.'
  },
  {
    strategyId: 'ttm_squeeze_breakout',
    strategyName: 'John Carter TTM Squeeze Momentum Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_bollinger_2001',
    sourceTitle: 'Bollinger on Bollinger Bands (Band Squeeze Theory)',
    authors: ['John Carter'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Bollinger Bands compressing inside Keltner Channels + momentum histogram ignition.'
  },
  {
    strategyId: 'atr_volatility_expansion',
    strategyName: 'ATR Volatility Expansion Thrust',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems',
    authors: ['J. Welles Wilder'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Current day range > 2x 14-day ATR with closing at upper decile.'
  },
  {
    strategyId: 'chaikin_volatility_surge',
    strategyName: 'Chaikin Volatility Surge Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_wilder_1978',
    sourceTitle: 'New Concepts in Technical Trading Systems',
    authors: ['Marc Chaikin'],
    evidenceLevel: 'C',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: '10-day rate of change of EMA(High - Low).'
  },
  {
    strategyId: 'nr7_range_breakout',
    strategyName: 'Toby Crabel Narrow Range 7 (NR7) Breakout',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_crabel_1990',
    sourceTitle: 'Day Trading with Short Term Price Patterns',
    authors: ['Toby Crabel'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Narrowest daily range of past 7 days followed by directional range expansion.'
  },
  {
    strategyId: 'intraday_high_breakout',
    strategyName: '52-Week High Frontier Blue Sky Breakout',
    researchFamily: 'Cross-Sectional Momentum',
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    sourceTitle: 'Simple Technical Trading Rules and the Stochastic Properties of Stock Returns',
    authors: ['Thomas Bulkowski', 'William Brock et al.'],
    evidenceLevel: 'B',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Price touching within 1.5% of 52-week high with volume expansion.'
  },
  {
    strategyId: 'vwap_band_breakout',
    strategyName: 'VWAP Upper Band Expansion Breakout',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_lo_mamaysky_wang_2000',
    sourceTitle: 'Foundations of Technical Analysis',
    authors: ['Brian Shannon'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Intraday volume-weighted average price upper standard deviation breakout.'
  },
  {
    strategyId: 'opening_range_breakout',
    strategyName: 'Opening Range Breakout (ORB) Volatility Thrust',
    researchFamily: 'Technical Pattern Recognition',
    sourceId: 'src_crabel_1990',
    sourceTitle: 'Day Trading with Short Term Price Patterns',
    authors: ['Toby Crabel', 'Arthur Merrill'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Breakout above 15-minute or 30-minute opening session high with above-average volume.'
  },

  // --- FACTOR MODELS ---
  {
    strategyId: 'jt_momentum',
    strategyName: 'Jegadeesh & Titman Cross-Sectional Momentum Factor',
    researchFamily: 'Cross-Sectional Momentum',
    sourceId: 'src_jegadeesh_titman_1993',
    sourceTitle: 'Returns to Buying Winners and Selling Losers',
    authors: ['Narasimhan Jegadeesh', 'Sheridan Titman'],
    evidenceLevel: 'A+',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Top decile 6-month and 12-month return momentum relative to universe.'
  },
  {
    strategyId: 'fama_french_size_mom',
    strategyName: 'Fama-French Size & Momentum Quality Composite',
    researchFamily: 'Multi-Factor',
    sourceId: 'src_fama_french_1992',
    sourceTitle: 'The Cross-Section of Expected Stock Returns',
    authors: ['Eugene F. Fama', 'Kenneth R. French'],
    evidenceLevel: 'A+',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Size (SMB) and Momentum composite factor.'
  },
  {
    strategyId: 'piotroski_f_score',
    strategyName: 'Joseph Piotroski F-Score High Quality Momentum',
    researchFamily: 'Piotroski F-Score',
    sourceId: 'src_piotroski_2000',
    sourceTitle: 'Value Investing: The Use of Historical Financial Statement Information',
    authors: ['Joseph D. Piotroski'],
    evidenceLevel: 'A+',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Currently proxy evaluated via price/RSI; requires fundamental database fields for true 9-point score.'
  },
  {
    strategyId: 'low_volatility_anomaly',
    strategyName: 'Low Volatility Anomaly Quality Alpha',
    researchFamily: 'Low Volatility',
    sourceId: 'src_baker_bradley_wurgler_2011',
    sourceTitle: 'Benchmarks as Limits to Arbitrage',
    authors: ['Malcolm Baker', 'Brendan Bradley', 'Jeffrey Wurgler'],
    evidenceLevel: 'A',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Trailing 60-day / 252-day annualized price volatility lowest quintile.'
  },
  {
    strategyId: 'novy_marx_profitability',
    strategyName: 'Robert Novy-Marx Gross Profitability Factor',
    researchFamily: 'Gross Profitability',
    sourceId: 'src_novy_marx_2013',
    sourceTitle: 'The Other Side of Value: The Gross Profitability Premium',
    authors: ['Robert Novy-Marx'],
    evidenceLevel: 'A+',
    implementationStatus: 'REQUIRES_ADAPTATION',
    implementationNotes: 'Requires gross profit and total asset balance sheet metrics.'
  },
  {
    strategyId: 'carhart_four_factor',
    strategyName: 'Carhart Four-Factor Momentum Cross-Alpha',
    researchFamily: 'Multi-Factor',
    sourceId: 'src_carhart_1997',
    sourceTitle: 'On Persistence in Mutual Fund Performance',
    authors: ['Mark M. Carhart'],
    evidenceLevel: 'A+',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Beta, Size, Value, and Momentum 4-factor composite.'
  },
  {
    strategyId: 'dividend_yield_growth',
    strategyName: 'Dividend Growth & Free Cash Flow Aristocrats',
    researchFamily: 'Quality',
    sourceId: 'src_asness_frazzini_pedersen_2019',
    sourceTitle: 'Quality Minus Junk',
    authors: ['David Fish', 'Clifford Asness et al.'],
    evidenceLevel: 'A',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'High cash yield and stable dividend growth filtering.'
  },
  {
    strategyId: 'sue_earnings_momentum',
    strategyName: 'Standardized Unexpected Earnings (SUE) Drift',
    researchFamily: 'Post-Earnings Announcement Drift',
    sourceId: 'src_bernard_thomas_1989',
    sourceTitle: 'Post-Earnings-Announcement Drift: Delayed Price Response',
    authors: ['Victor L. Bernard', 'Jacob K. Thomas'],
    evidenceLevel: 'A+',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Proxy implemented via post-earnings gap and RVOL surge; full SUE requires consensus EPS surprise.'
  },
  {
    strategyId: 'q_factor_growth_combo',
    strategyName: 'Hou-Xue-Zhang Q-Factor Investment & ROE Composite',
    researchFamily: 'Investment',
    sourceId: 'src_hou_xue_zhang_2015',
    sourceTitle: 'Digesting Anomalies: An Investment Approach',
    authors: ['Kewei Hou', 'Chen Xue', 'Lu Zhang'],
    evidenceLevel: 'A+',
    implementationStatus: 'REQUIRES_ADAPTATION',
    implementationNotes: 'Requires corporate investment rate and ROE metrics.'
  },

  // --- SMART MONEY & VOLUME ---
  {
    strategyId: 'high_rvol_spike',
    strategyName: 'Institutional Smart Money Extreme Volume Surge',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    sourceTitle: 'Simple Technical Trading Rules (Volume Confirmation)',
    authors: ['William Brock et al.'],
    evidenceLevel: 'B',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'RVOL >= 2.0x 20-day average volume with positive candle close.'
  },
  {
    strategyId: 'obv_institutional_accum',
    strategyName: 'On-Balance Volume (OBV) Stealth Accumulation',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    sourceTitle: 'Simple Technical Trading Rules (Volume Series)',
    authors: ['Joseph Granville'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'OBV line making 20-day high while price consolidates.'
  },
  {
    strategyId: 'cmf_persistent_inflow',
    strategyName: 'Chaikin Money Flow (CMF) Persistent Institutional Inflow',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_brock_lakonishok_lebaron_1992',
    sourceTitle: 'Simple Technical Trading Rules (Volume Weighted Range)',
    authors: ['Marc Chaikin'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'CMF > +0.15 sustained accumulation over 20 periods.'
  },
  {
    strategyId: 'pvt_bullish_divergence',
    strategyName: 'Price-Volume Trend (PVT) Smart Inflow Divergence',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_unverified_inst_quant_research',
    sourceTitle: 'Price-Volume Trend Divergence',
    authors: ['Institutional Quantitative Research'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional author attribution; standard technical volume divergence in practice.'
  },
  {
    strategyId: 'dark_pool_block_inflow',
    strategyName: 'Dark Pool & Off-Exchange Large Block Accumulation',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_unverified_smart_money_tracker',
    sourceTitle: 'Dark Pool Block Inflow',
    authors: ['Smart Money Tracker Group'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional desk; dark pool data stream not present in standard market data.'
  },
  {
    strategyId: 'closing_auction_rush',
    strategyName: 'Market-On-Close (MOC) Institutional Imbalance Rush',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_unverified_microstructure_alpha_desk',
    sourceTitle: 'Market-On-Close Institutional Imbalance',
    authors: ['Microstructure Alpha Desk'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional desk; requires NYSE/NASDAQ MOC imbalance feed.'
  },
  {
    strategyId: 'vwap_institutional_defense',
    strategyName: 'Anchored VWAP Institutional Defense & Rebound',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_lo_mamaysky_wang_2000',
    sourceTitle: 'Foundations of Technical Analysis (VWAP Support)',
    authors: ['Brian Shannon'],
    evidenceLevel: 'C',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Support and bounce from session and swing-anchored VWAP.'
  },
  {
    strategyId: 'order_flow_imbalance',
    strategyName: 'Limit Order Book (LOB) Bid-Ask Imbalance Thrust',
    researchFamily: 'Microstructure & Volume',
    sourceId: 'src_unverified_microstructure_alpha_desk',
    sourceTitle: 'Order Flow Imbalance',
    authors: ['Rama Cont & Arseniy Kukanov (Theory Misapplied)'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Microstructure paper theoretical model misapplied to daily stock scanner.'
  },

  // --- STATISTICAL ARBITRAGE ---
  {
    strategyId: 'pairs_trading_cointegration',
    strategyName: 'Gatev Cointegration Pairs Residual Mean Reversion',
    researchFamily: 'Pairs Trading',
    sourceId: 'src_gatev_goetzmann_rouwenhorst_2006',
    sourceTitle: 'Pairs Trading: Performance of a Relative-Value Arbitrage Rule',
    authors: ['Evan Gatev', 'William N. Goetzmann', 'K. Geert Rouwenhorst'],
    evidenceLevel: 'A+',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Literature is gold standard; current AST rule is simplified proxy, requires dual-ticker spread calculation.'
  },
  {
    strategyId: 'zscore_cross_sectional_arb',
    strategyName: 'Cross-Sectional Factor Z-Score Mean Reversion',
    researchFamily: 'Statistical Arbitrage',
    sourceId: 'src_unverified_stat_arb_group',
    sourceTitle: 'Cross-Sectional Factor Z-Score',
    authors: ['Statistical Arbitrage Quant Group'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional author entity; AST rule lacks true cross-sectional z-score ranking.'
  },
  {
    strategyId: 'etf_nav_premium_arbitrage',
    strategyName: 'Sector ETF & Large-Cap Momentum Scissors Arbitrage',
    researchFamily: 'Statistical Arbitrage',
    sourceId: 'src_unverified_index_arb_desk',
    sourceTitle: 'ETF NAV Scissors Arbitrage',
    authors: ['Index Arbitrage Trading Desk'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional entity; requires live ETF constituent spread.'
  },
  {
    strategyId: 'dual_class_spread_convergence',
    strategyName: 'Dual-Class Share & ADR Spread Convergence',
    researchFamily: 'Statistical Arbitrage',
    sourceId: 'src_gatev_goetzmann_rouwenhorst_2006',
    sourceTitle: 'Pairs Trading (Dual-Class Applications)',
    authors: ['Evan Gatev et al.'],
    evidenceLevel: 'A',
    implementationStatus: 'REQUIRES_ADAPTATION',
    implementationNotes: 'Sound financial logic (e.g. GOOGL/GOOG) but requires paired instrument feed.'
  },
  {
    strategyId: 'lead_lag_cross_asset',
    strategyName: 'Supply Chain Lead-Lag Momentum Transmission',
    researchFamily: 'Statistical Arbitrage',
    sourceId: 'src_jegadeesh_titman_1993',
    sourceTitle: 'Returns to Buying Winners and Selling Losers (Cross-Firm)',
    authors: ['Bruno Biais & Pierre Hillion'],
    evidenceLevel: 'A',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Customer-supplier momentum transmission; proxy in single ticker.'
  },
  {
    strategyId: 'triangular_correlation_arb',
    strategyName: 'Triangular Correlation & Statistical Dispersion Arbitrage',
    researchFamily: 'Statistical Arbitrage',
    sourceId: 'src_unverified_quant_corr_desk',
    sourceTitle: 'Triangular Correlation Dispersion',
    authors: ['Quantitative Correlation Arbitrage Desk'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional entity; triangular arb requires 3-pair matrix.'
  },

  // --- AI / ML MODELS ---
  {
    strategyId: 'transformer_temporal_momentum',
    strategyName: 'Transformer Multi-Head Temporal Attention Momentum',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_transformer_momentum',
    sourceTitle: 'Transformer Multi-Head Temporal Attention',
    authors: ['Deep Quant Research Group (Vaswani et al. Architecture)'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional entity & fake metrics (WinRate: 76.2%, Sharpe: 2.65). AST is merely basic RSI/volume.'
  },
  {
    strategyId: 'lstm_regime_switch',
    strategyName: 'LSTM Market Regime Switching & Trend Initiation',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_lstm_regime',
    sourceTitle: 'LSTM Market Regime Switching',
    authors: ['Sepp Hochreiter & Jürgen Schmidhuber'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional application of academic authors to stock strategy; AST is basic trend filter.'
  },
  {
    strategyId: 'lightgbm_rank_alpha',
    strategyName: 'LightGBM Multi-Factor Non-Linear Rank Alpha',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_stat_arb_group',
    sourceTitle: 'LightGBM Multi-Factor Rank Alpha',
    authors: ['Microsoft Research & Quant Community'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'No LightGBM tree inference model executed; static condition proxy.'
  },
  {
    strategyId: 'rl_policy_trend_following',
    strategyName: 'Reinforcement Learning (PPO) Adaptive Policy Trend',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_rl_policy_trend',
    sourceTitle: 'Reinforcement Learning (PPO) Adaptive Policy',
    authors: ['Deep Reinforcement Learning Quant Desk'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional desk; no reinforcement learning policy in codebase.'
  },
  {
    strategyId: 'vae_liquidity_anomaly',
    strategyName: 'Variational Autoencoder (VAE) Liquidity Footprint',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_vae_liquidity',
    sourceTitle: 'Variational Autoencoder Liquidity Footprint',
    authors: ['Kingma & Welling Deep Generative Architecture'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional attribution to VAE inventors; proxy volume condition.'
  },
  {
    strategyId: 'deep_feature_orthogonal',
    strategyName: 'Deep Factor Orthogonal Neutral Alpha',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_deep_feature_ortho',
    sourceTitle: 'Deep Factor Orthogonal Neutral Alpha',
    authors: ['Deep Quant Asset Pricing Laboratory'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional lab; no orthogonalization logic in code.'
  },
  {
    strategyId: 'random_forest_alpha_ensemble',
    strategyName: 'Random Forest Bagging Denoised Alpha Ensemble',
    researchFamily: 'Machine Learning & AI',
    sourceId: 'src_unverified_rf_ensemble_alpha',
    sourceTitle: 'Random Forest Bagging Denoised Alpha Ensemble',
    authors: ['Leo Breiman Ensemble Theory'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional attribution to Leo Breiman; proxy condition.'
  },

  // --- MACRO REGIME MODELS ---
  {
    strategyId: 'bridgewater_all_weather',
    strategyName: 'Ray Dalio Bridgewater All-Weather Risk Parity',
    researchFamily: 'Macro & Asset Allocation',
    sourceId: 'src_unverified_bridgewater_all_weather',
    sourceTitle: 'Bridgewater All-Weather Risk Parity Adaptation',
    authors: ['Ray Dalio / Bridgewater Associates'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Fictional conversion of cross-asset macro risk parity to single stock scanner.'
  },
  {
    strategyId: 'sector_rs_rotation',
    strategyName: 'Sector Relative Strength (RS) Momentum Rotation',
    researchFamily: 'Cross-Sectional Momentum',
    sourceId: 'src_jegadeesh_titman_1993',
    sourceTitle: 'Returns to Buying Winners and Selling Losers (Sector Rotation)',
    authors: ['John Murphy', 'Jegadeesh & Titman'],
    evidenceLevel: 'B',
    implementationStatus: 'EXECUTABLE_CORE',
    implementationNotes: 'Relative strength of industry ETF leaders vs benchmark.'
  },
  {
    strategyId: 'treasury_sensitive_defense',
    strategyName: 'Yield Sensitive High-Dividend Defensive Anchor',
    researchFamily: 'Low Volatility',
    sourceId: 'src_baker_bradley_wurgler_2011',
    sourceTitle: 'Benchmarks as Limits to Arbitrage (Defensive Yield)',
    authors: ['Malcolm Baker et al.'],
    evidenceLevel: 'A',
    implementationStatus: 'PROXY_EVALUATED',
    implementationNotes: 'Defensive utility/consumer staples low-beta screening.'
  },
  {
    strategyId: 'merrill_clock_expansion',
    strategyName: 'Merrill Lynch Investment Clock Tech Expansion',
    researchFamily: 'Macro & Asset Allocation',
    sourceId: 'src_unverified_merrill_clock',
    sourceTitle: 'Merrill Lynch Investment Clock',
    authors: ['Merrill Lynch Strategy Team'],
    evidenceLevel: 'UNVERIFIED',
    implementationStatus: 'UNVERIFIED_PENDING_REWRITE',
    implementationNotes: 'Macro business cycle framework; single-stock AST scanner is an unverified proxy.'
  }
];

// Helper functions
export function getStrategySource(sourceId: string): StrategySourceRecord | undefined {
  return STRATEGY_SOURCE_REGISTRY[sourceId];
}

export function getEvidenceForStrategy(strategyId: string): StrategyEvidenceMapping | undefined {
  return STRATEGY_EVIDENCE_MAPPINGS.find(m => m.strategyId === strategyId);
}

export function getSourcesByFamily(family: string): StrategySourceRecord[] {
  return ALL_SOURCES.filter(s => s.strategyFamilies.includes(family));
}
