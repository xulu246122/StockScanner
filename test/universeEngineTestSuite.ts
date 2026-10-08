import { universeDb } from '../server/db/universeDb.ts';
import { universeIngestionService } from '../server/services/universeIngestionService.ts';
import { universeBuilder } from '../server/services/universeBuilder.ts';

async function runUniverseTestSuite() {
  console.log('🚀 Starting US Market Universe Engine Test Suite...\n');

  // Step 1: Initialize Database & Ingest
  console.log('--- 1. Testing Database & Master Seeding ---');
  await universeIngestionService.initializeUniverse();
  await universeBuilder.buildAllUniverses();
  const counts = universeDb.getCounts();

  console.log(`  ✓ Master Database initialized.`);
  console.log(`  ✓ Total Instruments: ${counts.totalInstruments}`);
  console.log(`  ✓ Active Common Stocks: ${counts.activeStocks}`);
  console.log(`  ✓ ETF Count: ${counts.etfCount}`);
  console.log(`  ✓ ADR Count: ${counts.adrCount}`);
  console.log(`  ✓ REIT Count: ${counts.reitCount}`);
  console.log(`  ✓ OTC Count: ${counts.otcCount}`);

  if (counts.totalInstruments === 0) {
    throw new Error('Instruments table is empty!');
  }

  // Step 2: Test 16 Universes
  console.log('\n--- 2. Testing 16 Mandatory Universes ---');
  const universes = universeDb.getAllUniverses();
  console.log(`  ✓ Total Universes Registered: ${universes.length} / 16`);

  const requiredCodes = [
    'SP500', 'NASDAQ100', 'MEGA_CAP', 'LARGE_CAP', 'MID_CAP', 'SMALL_CAP',
    'US_LIQUID', 'NYSE_STOCKS', 'NASDAQ_STOCKS', 'ADR', 'REIT',
    'SECTOR_TECH', 'INDUSTRY_SEMIS', 'ETF', 'WATCHLIST', 'CUSTOM'
  ];

  for (const code of requiredCodes) {
    const univ = universeDb.getUniverseByCode(code);
    if (!univ) {
      throw new Error(`Mandatory universe ${code} not found!`);
    }
    const members = universeDb.getUniverseInstruments(code, 500);
    console.log(`  ✓ Universe [${code.padEnd(14)}] "${univ.name}": ${univ.memberCount} members (loaded ${members.length})`);
    if (univ.memberCount === 0 && code !== 'WATCHLIST') {
      throw new Error(`Universe ${code} has 0 members!`);
    }
  }

  // Step 3: Test Many-to-Many Membership
  console.log('\n--- 3. Testing Many-to-Many Universe Membership ---');
  const nvda = universeDb.getInstrumentByTicker('NVDA');
  if (!nvda) throw new Error('NVDA not found in database');

  const sp500Tickers = universeDb.getUniverseMemberTickers('SP500');
  const ndxTickers = universeDb.getUniverseMemberTickers('NASDAQ100');
  const megaTickers = universeDb.getUniverseMemberTickers('MEGA_CAP');
  const liquidTickers = universeDb.getUniverseMemberTickers('US_LIQUID');

  console.log(`  ✓ NVDA in S&P 500: ${sp500Tickers.includes('NVDA')}`);
  console.log(`  ✓ NVDA in Nasdaq 100: ${ndxTickers.includes('NVDA')}`);
  console.log(`  ✓ NVDA in Mega Cap: ${megaTickers.includes('NVDA')}`);
  console.log(`  ✓ NVDA in US Liquid Stocks: ${liquidTickers.includes('NVDA')}`);

  if (!sp500Tickers.includes('NVDA') || !ndxTickers.includes('NVDA') || !megaTickers.includes('NVDA')) {
    throw new Error('Many-to-many membership validation failed for NVDA');
  }

  // Step 4: Search Tests (Tickers & Company Names)
  console.log('\n--- 4. Testing Multi-Tier Ranked Search Engine ---');
  const testTickers = [
    'AAPL', 'NVDA', 'TSLA', 'MSFT', 'PLTR', 'AMD',
    'AMAT', 'LRCX', 'TSM', 'BABA', 'NVO', 'ASML'
  ];

  for (const t of testTickers) {
    const results = universeDb.searchInstruments(t, 5);
    const topMatch = results[0];
    if (!topMatch || topMatch.ticker !== t) {
      throw new Error(`Search ticker exact match failed for: ${t}. Got: ${topMatch?.ticker}`);
    }
    console.log(`  ✓ Ticker Search "${t}" -> Matched: [${topMatch.ticker}] ${topMatch.companyName} (${topMatch.securityType})`);
  }

  const testCompanyNames = [
    { query: 'Apple', expectedTicker: 'AAPL' },
    { query: 'NVIDIA', expectedTicker: 'NVDA' },
    { query: 'Tesla', expectedTicker: 'TSLA' },
    { query: 'Microsoft', expectedTicker: 'MSFT' },
    { query: 'Taiwan Semiconductor', expectedTicker: 'TSM' },
    { query: 'Alibaba', expectedTicker: 'BABA' }
  ];

  for (const item of testCompanyNames) {
    const results = universeDb.searchInstruments(item.query, 5);
    const match = results.find(r => r.ticker === item.expectedTicker);
    if (!match) {
      throw new Error(`Search company name failed for "${item.query}", expected ${item.expectedTicker}`);
    }
    console.log(`  ✓ Name Search "${item.query}" -> Matched: [${match.ticker}] ${match.companyName}`);
  }

  // Step 5: Test Index Constituent Revision History (ADD/REMOVE/UPDATE)
  console.log('\n--- 5. Testing Dynamic Index Constituent Tracking ---');
  const spxConstituents = universeDb.getIndexConstituents('SPX');
  const ndxConstituents = universeDb.getIndexConstituents('NDX');
  console.log(`  ✓ S&P 500 Constituent Revisions Tracked: ${spxConstituents.length}`);
  console.log(`  ✓ Nasdaq 100 Constituent Revisions Tracked: ${ndxConstituents.length}`);

  const pltrChange = spxConstituents.find(c => c.ticker === 'PLTR');
  console.log(`  ✓ PLTR S&P 500 Change Action: ${pltrChange?.changeType} on ${pltrChange?.effectiveDate} (Weight: ${pltrChange?.weight}%)`);
  if (!pltrChange || pltrChange.changeType !== 'ADD') {
    throw new Error('PLTR ADD change record missing in S&P 500 constituent history');
  }

  // Step 6: Exclusion & Liquid Stocks Rule Test
  console.log('\n--- 6. Testing Exclusion & US Liquid Stocks Rules ---');
  const otcInLiquid = liquidTickers.includes('TCNNF') || liquidTickers.includes('NTDOY');
  console.log(`  ✓ OTC stocks excluded from US Liquid Stocks: ${!otcInLiquid}`);
  if (otcInLiquid) {
    throw new Error('OTC stocks mistakenly included in liquid common stocks');
  }

  const etfInLiquid = liquidTickers.includes('SPY') || liquidTickers.includes('QQQ');
  console.log(`  ✓ ETFs excluded from US Liquid Stocks: ${!etfInLiquid}`);
  if (etfInLiquid) {
    throw new Error('ETFs mistakenly included in liquid common stocks');
  }

  // Final Summary Report
  console.log('\n==================================================');
  console.log('📊 US MARKET UNIVERSE SYSTEM FINAL REPORT');
  console.log('==================================================');
  console.log(`• Instrument 总数:     ${counts.totalInstruments}`);
  console.log(`• Active Stocks 数量:  ${counts.activeStocks}`);
  console.log(`• ETF 数量:            ${counts.etfCount}`);
  console.log(`• ADR 数量:            ${counts.adrCount}`);
  console.log(`• REIT 数量:           ${counts.reitCount}`);
  console.log(`• OTC 数量:            ${counts.otcCount}`);
  console.log(`• S&P500 数量:         ${counts.sp500Count}`);
  console.log(`• Nasdaq100 数量:      ${counts.nasdaq100Count}`);
  console.log(`• Search Test:         PASSED (100% exact & fuzzy matching)`);
  console.log(`• Universe Test:       PASSED (All 16 universes verified)`);
  console.log('==================================================\n');
  console.log('🎉 All US Market Universe Engine tests passed successfully!');
}

runUniverseTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
