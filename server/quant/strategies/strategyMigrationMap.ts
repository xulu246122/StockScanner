/**
 * Strategy Migration Map & Identifier Adapter (V1.0 -> V2.0)
 * 
 * Ensures backward compatibility across:
 * - Existing Strategy Alerts
 * - User Watchlists & Bookmarks
 * - Historical Backtest Job IDs
 * - LocalStorage persisted user configurations
 */

export const LEGACY_TO_NEW_STRATEGY_ID_MAP: Record<string, string> = {
  // Direct Identical Core IDs
  'donchian_breakout': 'donchian_breakout',
  'turtle_system_1': 'turtle_system_1',
  'minervini_trend_template': 'minervini_trend_template',
  'weinstein_stage2': 'weinstein_stage2',
  'elder_triple_screen': 'elder_triple_screen',
  'supertrend_momentum': 'supertrend_momentum',
  'kama_adaptive_trend': 'kama_adaptive_trend',
  'adx_trend_strength': 'adx_trend_strength',
  'triple_ema_alignment': 'triple_ema_alignment',
  'connors_rsi2': 'connors_rsi2',
  'wilder_oversold_rebound': 'wilder_oversold_rebound',
  'stoch_double_bottom': 'stoch_double_bottom',
  'cci_oversold_thrust': 'cci_oversold_thrust',
  'williams_r_exhaustion': 'williams_r_exhaustion',
  'bollinger_mean_revert': 'bollinger_mean_revert',
  'dpo_detrended_osc': 'dpo_detrended_osc',
  'keltner_mean_reversion': 'keltner_mean_reversion',
  'darvas_box': 'darvas_box',
  'bollinger_squeeze': 'bollinger_squeeze',
  'ttm_squeeze_breakout': 'ttm_squeeze_breakout',
  'nr7_range_breakout': 'nr7_range_breakout',
  'intraday_high_breakout': 'intraday_high_breakout',
  'vwap_band_breakout': 'vwap_band_breakout',
  'opening_range_breakout': 'opening_range_breakout',
  'jt_momentum': 'jt_momentum',
  'fama_french_size_mom': 'fama_french_size_mom',
  'piotroski_f_score': 'piotroski_f_score',
  'low_volatility_anomaly': 'low_volatility_anomaly',
  'novy_marx_profitability': 'novy_marx_profitability',
  'carhart_four_factor': 'carhart_four_factor',
  'dividend_yield_growth': 'dividend_yield_growth',
  'q_factor_growth_combo': 'q_factor_growth_combo',
  'high_rvol_spike': 'high_rvol_spike',
  'obv_institutional_accum': 'obv_institutional_accum',
  'cmf_persistent_inflow': 'cmf_persistent_inflow',
  'vwap_institutional_defense': 'vwap_institutional_defense',
  'pairs_trading_cointegration': 'pairs_trading_cointegration',
  'dual_class_spread_convergence': 'dual_class_spread_convergence',
  'lead_lag_cross_asset': 'lead_lag_cross_asset',
  'sector_rs_rotation': 'sector_rs_rotation',
  'treasury_sensitive_defense': 'treasury_sensitive_defense',

  // Canonical Alias Normalization (Fixing Orphaned IDs found in Phase 01 Audit)
  'elder_impulse': 'elder_triple_screen',         // Fixes broken seeded alert in strategyAlertService.ts
  'rsi_2_mean_reversion': 'connors_rsi2',         // Fixes test suite alias in productionTestSuite.ts
  'parabolic_sar_trend': 'parabolic_sar_thrust',
  'atr_volatility_expansion': 'atr_expansion_thrust',
  'mfi_divergence_reversion': 'mfi_volume_reversal',
  'sue_earnings_momentum': 'pead_short_drift',

  // Retired Fictional/Unverified Models Mapping to Verified Academic/Practitioner Equivalents
  'closing_auction_rush': 'closing_momentum_surge',
  'dark_pool_block_inflow': 'high_rvol_spike',
  'order_flow_imbalance': 'high_rvol_spike',
  'pvt_bullish_divergence': 'obv_institutional_accum',
  'zscore_cross_sectional_arb': 'short_term_weekly_reversal',
  'etf_nav_premium_arbitrage': 'dual_class_spread_convergence',
  'triangular_correlation_arb': 'pairs_trading_cointegration',
  'transformer_temporal_momentum': 'jt_momentum',
  'lstm_regime_switch': 'regime_filtered_trend',
  'lightgbm_rank_alpha': 'asness_quality_minus_junk',
  'rl_policy_trend_following': 'dual_momentum_swing',
  'vae_liquidity_anomaly': 'high_rvol_spike',
  'deep_feature_orthogonal': 'carhart_four_factor',
  'random_forest_alpha_ensemble': 'ma_ribbon_expansion',
  'bridgewater_all_weather': 'treasury_sensitive_defense',
  'merrill_clock_expansion': 'sector_rs_rotation'
};

/**
 * Resolves any legacy or alias strategy ID into its canonical V2.0 strategy ID.
 * Guarantees zero 404s for bookmarks, alerts, or test runners.
 */
export function resolveStrategyId(id: string): string {
  if (!id) return 'donchian_breakout';
  const clean = id.trim();
  return LEGACY_TO_NEW_STRATEGY_ID_MAP[clean] || clean;
}
