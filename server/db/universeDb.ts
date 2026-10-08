import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { RadarPreset, AlertRule, AlertEvent } from '../types.ts';
import { BrokerPosition, BrokerOrder } from '../types/trading.ts';
import { SYSTEM_RADAR_PRESETS } from '../quant/filters/defaultPresets.ts';
import { getDataFilePath } from '../utils/pathResolver.ts';

const DB_FILE_PATH = getDataFilePath('universe.sqlite');

export interface InstrumentEntity {
  id: string;
  ticker: string;
  companyName: string;
  market: string;
  locale: string;
  primaryExchange: string;
  securityType: 'COMMON_STOCK' | 'ADR' | 'REIT' | 'ETF' | 'INDEX' | 'PREFERRED' | 'WARRANT' | 'RIGHT' | 'UNIT' | 'OTC' | 'OTHER';
  assetClass: 'stocks' | 'etf' | 'indices';
  currency: string;
  active: boolean;
  cik?: string;
  figi?: string;
  marketCap: number;
  sector?: string;
  industry?: string;
  isADR: boolean;
  isREIT: boolean;
  isETF: boolean;
  isIndex: boolean;
  avgVolume20d: number;
  avgDollarVolume20d: number;
  lastPrice: number;
  lastUpdated: string;
  source: string;
}

export interface UniverseEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'INDEX' | 'CAPITALIZATION' | 'LIQUIDITY' | 'EXCHANGE' | 'ASSET_TYPE' | 'SECTOR' | 'CUSTOM';
  rulesJson?: string;
  isSystem: boolean;
  memberCount: number;
  expectedCount?: number;
  lastRebuiltAt?: string;
}

export interface UniverseMembershipEntity {
  universeId: string;
  instrumentId: string;
  addedAt: string;
  weight?: number;
}

export interface IndexConstituentEntity {
  id: string;
  indexSymbol: string;
  ticker: string;
  companyName?: string;
  changeType: 'ADD' | 'REMOVE' | 'UPDATE' | 'CURRENT';
  effectiveDate: string;
  weight: number;
  source: string;
  lastUpdated: string;
}

class UniverseDatabase {
  private db: SqlJsDatabase | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized && this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const SQL = await initSqlJs();
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const fileBuffer = fs.readFileSync(DB_FILE_PATH);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.db = new SQL.Database();
      }

      this.createSchema();
      this.seedSystemPresets();
      this.seedDefaultWatchlist();
      this.initialized = true;
      this.saveSync();
    })();

    return this.initPromise;
  }

  public isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  private createSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS instruments (
        id TEXT PRIMARY KEY,
        ticker TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        market TEXT NOT NULL,
        locale TEXT NOT NULL,
        primary_exchange TEXT NOT NULL,
        security_type TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        currency TEXT DEFAULT 'USD',
        active INTEGER NOT NULL DEFAULT 1,
        cik TEXT,
        figi TEXT,
        market_cap REAL DEFAULT 0,
        sector TEXT,
        industry TEXT,
        is_adr INTEGER NOT NULL DEFAULT 0,
        is_reit INTEGER NOT NULL DEFAULT 0,
        is_etf INTEGER NOT NULL DEFAULT 0,
        is_index INTEGER NOT NULL DEFAULT 0,
        avg_volume_20d REAL DEFAULT 0,
        avg_dollar_volume_20d REAL DEFAULT 0,
        last_price REAL DEFAULT 0,
        last_updated TEXT NOT NULL,
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inst_ticker ON instruments(ticker);
      CREATE INDEX IF NOT EXISTS idx_inst_company ON instruments(company_name);
      CREATE INDEX IF NOT EXISTS idx_inst_type ON instruments(security_type);
      CREATE INDEX IF NOT EXISTS idx_inst_cap ON instruments(market_cap);
      CREATE INDEX IF NOT EXISTS idx_inst_adr ON instruments(is_adr);
      CREATE INDEX IF NOT EXISTS idx_inst_reit ON instruments(is_reit);
      CREATE INDEX IF NOT EXISTS idx_inst_etf ON instruments(is_etf);
      CREATE INDEX IF NOT EXISTS idx_inst_active ON instruments(active);

      CREATE TABLE IF NOT EXISTS universes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        rules_json TEXT,
        is_system INTEGER DEFAULT 1,
        member_count INTEGER DEFAULT 0,
        expected_count INTEGER DEFAULT 0,
        last_rebuilt_at TEXT
      );

      CREATE TABLE IF NOT EXISTS universe_members (
        universe_id TEXT NOT NULL,
        instrument_id TEXT NOT NULL,
        added_at TEXT NOT NULL,
        weight REAL DEFAULT 0,
        PRIMARY KEY (universe_id, instrument_id),
        FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_um_univ ON universe_members(universe_id);
      CREATE INDEX IF NOT EXISTS idx_um_inst ON universe_members(instrument_id);

      CREATE TABLE IF NOT EXISTS index_constituents (
        id TEXT PRIMARY KEY,
        index_symbol TEXT NOT NULL,
        ticker TEXT NOT NULL,
        company_name TEXT,
        change_type TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        weight REAL DEFAULT 0,
        source TEXT NOT NULL,
        last_updated TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ic_sym ON index_constituents(index_symbol);
      CREATE INDEX IF NOT EXISTS idx_ic_ticker ON index_constituents(ticker);

      CREATE TABLE IF NOT EXISTS screening_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        description TEXT,
        mode TEXT NOT NULL DEFAULT 'PRO',
        profile_type TEXT NOT NULL,
        rules_json TEXT NOT NULL,
        ranking_weights_json TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sp_mode ON screening_presets(mode);
      CREATE INDEX IF NOT EXISTS idx_sp_sys ON screening_presets(is_system);

      CREATE TABLE IF NOT EXISTS screening_runs (
        id TEXT PRIMARY KEY,
        preset_id TEXT,
        scanned_count INTEGER NOT NULL,
        matched_count INTEGER NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        market_regime TEXT,
        created_at TEXT NOT NULL
      );

      -- ==========================================================
      -- 1. Watchlist Table (纯本地自选股持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS watchlist_table (
        ticker TEXT PRIMARY KEY,
        added_at TEXT NOT NULL,
        notes TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0
      );

      -- ==========================================================
      -- 2. Alert Rules Table (量化预警规则持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS alert_rules_table (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        period INTEGER NOT NULL DEFAULT 14,
        timeframe TEXT DEFAULT '1D',
        condition_type TEXT NOT NULL,
        threshold_value REAL NOT NULL,
        threshold_max REAL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        state TEXT,
        trigger_frequency TEXT,
        last_triggered_at TEXT,
        last_checked_rsi REAL,
        target_dimension TEXT DEFAULT 'RSI',
        operator TEXT,
        threshold_secondary REAL,
        notify_sound INTEGER DEFAULT 1,
        sound_type TEXT DEFAULT 'DIGITAL_CHIME',
        notify_push INTEGER DEFAULT 1,
        expire_at TEXT,
        alert_name TEXT,
        custom_message TEXT,
        trigger_count INTEGER DEFAULT 0,
        last_checked_price REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_art_ticker ON alert_rules_table(ticker);

      -- ==========================================================
      -- 3. Alert Events Table (预警历史触发事件持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS alert_events_table (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        timeframe TEXT,
        triggered_rsi REAL,
        triggered_price REAL,
        triggered_value REAL,
        target_dimension TEXT,
        threshold REAL NOT NULL,
        condition_type TEXT NOT NULL,
        message TEXT NOT NULL,
        triggered_at TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_aet_alert_id ON alert_events_table(alert_id);
      CREATE INDEX IF NOT EXISTS idx_aet_ticker ON alert_events_table(ticker);
      CREATE INDEX IF NOT EXISTS idx_aet_triggered_at ON alert_events_table(triggered_at);

      -- ==========================================================
      -- 4. Paper Positions Table (纸盘/模拟持仓持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS paper_positions_table (
        symbol TEXT PRIMARY KEY,
        qty REAL NOT NULL,
        avg_entry_price REAL NOT NULL,
        current_price REAL NOT NULL,
        market_value REAL NOT NULL,
        cost_basis REAL NOT NULL,
        unrealized_pnl REAL NOT NULL,
        unrealized_pnl_percent REAL NOT NULL,
        take_profit_price REAL,
        stop_loss_price REAL,
        trailing_stop_price REAL,
        highest_price_since_entry REAL,
        break_even_active INTEGER NOT NULL DEFAULT 0,
        opened_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- ==========================================================
      -- 5. Paper Orders Table (纸盘/委托记录与挂单流水持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS paper_orders_table (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        order_type TEXT NOT NULL,
        order_class TEXT NOT NULL,
        qty REAL NOT NULL,
        limit_price REAL,
        stop_loss_price REAL,
        take_profit_price REAL,
        filled_price REAL,
        status TEXT NOT NULL,
        strategy_source TEXT,
        created_at TEXT NOT NULL,
        filled_at TEXT,
        cancelled_at TEXT,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pot_symbol ON paper_orders_table(symbol);
      CREATE INDEX IF NOT EXISTS idx_pot_created ON paper_orders_table(created_at);

      -- ==========================================================
      -- 6. Paper Account Table (沙盒账户现金与本金持久化)
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS paper_account_table (
        id TEXT PRIMARY KEY,
        cash REAL NOT NULL DEFAULT 100000.0,
        initial_balance REAL NOT NULL DEFAULT 100000.0,
        realized_pnl REAL NOT NULL DEFAULT 0.0,
        updated_at TEXT NOT NULL
      );

      -- ==========================================================
      -- 7. System Settings & Initialization Flags
      -- ==========================================================
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // High Performance In-Memory & WASM Page Cache PRAGMAs
    try {
      this.db.run(`
        PRAGMA cache_size = -64000;
        PRAGMA temp_store = MEMORY;
      `);
    } catch {}

    // Automatic migration for existing databases missing expected_count column
    try {
      this.db.run(`ALTER TABLE universes ADD COLUMN expected_count INTEGER DEFAULT 0`);
    } catch {
      // Column already exists
    }

    // Automatic migration for Universal Alert columns
    const universalAlertMigrations = [
      'ALTER TABLE alert_rules_table ADD COLUMN target_dimension TEXT DEFAULT "RSI"',
      'ALTER TABLE alert_rules_table ADD COLUMN operator TEXT',
      'ALTER TABLE alert_rules_table ADD COLUMN threshold_secondary REAL',
      'ALTER TABLE alert_rules_table ADD COLUMN notify_sound INTEGER DEFAULT 1',
      'ALTER TABLE alert_rules_table ADD COLUMN sound_type TEXT DEFAULT "DIGITAL_CHIME"',
      'ALTER TABLE alert_rules_table ADD COLUMN notify_push INTEGER DEFAULT 1',
      'ALTER TABLE alert_rules_table ADD COLUMN expire_at TEXT',
      'ALTER TABLE alert_rules_table ADD COLUMN alert_name TEXT',
      'ALTER TABLE alert_rules_table ADD COLUMN custom_message TEXT',
      'ALTER TABLE alert_rules_table ADD COLUMN trigger_count INTEGER DEFAULT 0',
      'ALTER TABLE alert_rules_table ADD COLUMN last_checked_price REAL',
      'ALTER TABLE alert_events_table ADD COLUMN triggered_price REAL',
      'ALTER TABLE alert_events_table ADD COLUMN triggered_value REAL',
      'ALTER TABLE alert_events_table ADD COLUMN target_dimension TEXT'
    ];
    for (const sql of universalAlertMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // Column already exists or table freshly created
      }
    }

    this.save(true);
  }

  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private isWriting: boolean = false;

  /**
   * Schedules a debounced batch persistence to eliminate I/O blocking and Windows EBUSY lock conflicts
   */
  public scheduleSave(delayMs: number = 300): void {
    if (process.env.NODE_ENV === 'test') {
      this.saveSync();
      return;
    }
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.saveAsync().catch(err => {
        console.error('[UniverseDB] Async flush error:', err);
      });
    }, delayMs);
    if (this.saveDebounceTimer && typeof this.saveDebounceTimer.unref === 'function') {
      this.saveDebounceTimer.unref();
    }
  }

  /**
   * Persists database to disk. When immediate is false (default in production), writes are debounced.
   */
  public save(immediate: boolean = false): void {
    if (immediate || process.env.NODE_ENV === 'test') {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
      }
      this.saveSync();
    } else {
      this.scheduleSave();
    }
  }

  /**
   * Synchronous persistence (used for initialization, graceful shutdown and unit tests)
   */
  public saveSync(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tmpPath, buffer);
      try {
        if (fs.existsSync(DB_FILE_PATH)) {
          fs.unlinkSync(DB_FILE_PATH);
        }
        fs.renameSync(tmpPath, DB_FILE_PATH);
      } catch {
        fs.writeFileSync(DB_FILE_PATH, buffer);
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
    } catch (err) {
      console.error('Failed to sync save SQLite database to disk:', err);
    }
  }

  /**
   * Asynchronous non-blocking persistence
   */
  public async saveAsync(): Promise<void> {
    if (!this.db || this.isWriting) return;
    this.isWriting = true;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${DB_FILE_PATH}.tmp`;
      await fs.promises.writeFile(tmpPath, buffer);
      try {
        if (fs.existsSync(DB_FILE_PATH)) {
          await fs.promises.unlink(DB_FILE_PATH).catch(() => {});
        }
        await fs.promises.rename(tmpPath, DB_FILE_PATH);
      } catch {
        await fs.promises.writeFile(DB_FILE_PATH, buffer);
        await fs.promises.unlink(tmpPath).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to async save SQLite database to disk:', err);
    } finally {
      this.isWriting = false;
    }
  }

  getDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  // Instrument Operations
  upsertInstrument(item: InstrumentEntity): void {
    const db = this.getDb();
    db.run(
      `INSERT INTO instruments (
        id, ticker, company_name, market, locale, primary_exchange,
        security_type, asset_class, currency, active, cik, figi,
        market_cap, sector, industry, is_adr, is_reit, is_etf, is_index,
        avg_volume_20d, avg_dollar_volume_20d, last_price, last_updated, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticker) DO UPDATE SET
        company_name = excluded.company_name,
        market = excluded.market,
        locale = excluded.locale,
        primary_exchange = excluded.primary_exchange,
        security_type = excluded.security_type,
        asset_class = excluded.asset_class,
        currency = excluded.currency,
        active = excluded.active,
        cik = COALESCE(excluded.cik, instruments.cik),
        figi = COALESCE(excluded.figi, instruments.figi),
        market_cap = excluded.market_cap,
        sector = COALESCE(excluded.sector, instruments.sector),
        industry = COALESCE(excluded.industry, instruments.industry),
        is_adr = excluded.is_adr,
        is_reit = excluded.is_reit,
        is_etf = excluded.is_etf,
        is_index = excluded.is_index,
        avg_volume_20d = excluded.avg_volume_20d,
        avg_dollar_volume_20d = excluded.avg_dollar_volume_20d,
        last_price = excluded.last_price,
        last_updated = excluded.last_updated,
        source = excluded.source`,
      [
        item.id,
        item.ticker.toUpperCase(),
        item.companyName,
        item.market,
        item.locale,
        item.primaryExchange,
        item.securityType,
        item.assetClass,
        item.currency || 'USD',
        item.active ? 1 : 0,
        item.cik || null,
        item.figi || null,
        item.marketCap || 0,
        item.sector || null,
        item.industry || null,
        item.isADR ? 1 : 0,
        item.isREIT ? 1 : 0,
        item.isETF ? 1 : 0,
        item.isIndex ? 1 : 0,
        item.avgVolume20d || 0,
        item.avgDollarVolume20d || 0,
        item.lastPrice || 0,
        item.lastUpdated,
        item.source
      ]
    );
  }

  getInstrumentByTicker(ticker: string): InstrumentEntity | null {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM instruments WHERE ticker = ? LIMIT 1`);
    stmt.bind([ticker.toUpperCase()]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return this.mapInstrumentRow(row);
    }
    stmt.free();
    return null;
  }

  getAllInstruments(filter?: { activeOnly?: boolean; limit?: number }): InstrumentEntity[] {
    const db = this.getDb();
    let query = `SELECT * FROM instruments`;
    if (filter?.activeOnly) {
      query += ` WHERE active = 1`;
    }
    query += ` ORDER BY market_cap DESC`;
    if (filter?.limit) {
      query += ` LIMIT ${filter.limit}`;
    }

    const res = db.exec(query);
    if (!res.length || !res[0].values) return [];

    const columns = res[0].columns;
    return res[0].values.map((v) => {
      const row: any = {};
      columns.forEach((c, idx) => { row[c] = v[idx]; });
      return this.mapInstrumentRow(row);
    });
  }

  // 5-Tier Ranked Search Engine
  searchInstruments(query: string, limit: number = 20): InstrumentEntity[] {
    const db = this.getDb();
    const cleanQ = query.trim().toUpperCase();
    if (!cleanQ) return [];

    const lowerQ = query.trim().toLowerCase();

    // Query with prioritization score:
    // 1: Exact ticker match (weight 100)
    // 2: Exact company name match (weight 80)
    // 3: Ticker prefix match (weight 60)
    // 4: Company name prefix match (weight 40)
    // 5: Substring match (weight 20)
    const sql = `
      SELECT *,
        CASE
          WHEN UPPER(ticker) = ? THEN 100
          WHEN LOWER(company_name) = ? THEN 80
          WHEN UPPER(ticker) LIKE ? THEN 60
          WHEN LOWER(company_name) LIKE ? THEN 40
          WHEN LOWER(company_name) LIKE ? OR UPPER(ticker) LIKE ? THEN 20
          ELSE 0
        END AS match_score
      FROM instruments
      WHERE
        UPPER(ticker) = ? OR
        LOWER(company_name) = ? OR
        UPPER(ticker) LIKE ? OR
        LOWER(company_name) LIKE ? OR
        LOWER(company_name) LIKE ? OR
        UPPER(ticker) LIKE ?
      ORDER BY match_score DESC, market_cap DESC, ticker ASC
      LIMIT ?
    `;

    const exactTicker = cleanQ;
    const exactName = lowerQ;
    const tickerPrefix = `${cleanQ}%`;
    const namePrefix = `${lowerQ}%`;
    const nameSubstring = `%${lowerQ}%`;
    const tickerSubstring = `%${cleanQ}%`;

    const stmt = db.prepare(sql);
    stmt.bind([
      exactTicker, exactName, tickerPrefix, namePrefix, nameSubstring, tickerSubstring,
      exactTicker, exactName, tickerPrefix, namePrefix, nameSubstring, tickerSubstring,
      limit
    ]);

    const results: InstrumentEntity[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push(this.mapInstrumentRow(row));
    }
    stmt.free();

    return results;
  }

  // Universe Operations
  upsertUniverse(univ: UniverseEntity): void {
    const db = this.getDb();
    db.run(
      `INSERT INTO universes (id, code, name, description, category, rules_json, is_system, member_count, expected_count, last_rebuilt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         category = excluded.category,
         rules_json = excluded.rules_json,
         is_system = excluded.is_system,
         member_count = excluded.member_count,
         expected_count = excluded.expected_count,
         last_rebuilt_at = excluded.last_rebuilt_at`,
      [
        univ.id,
        univ.code,
        univ.name,
        univ.description || null,
        univ.category,
        univ.rulesJson || null,
        univ.isSystem ? 1 : 0,
        univ.memberCount || 0,
        univ.expectedCount || univ.memberCount || 0,
        univ.lastRebuiltAt || new Date().toISOString()
      ]
    );
  }

  getAllUniverses(): UniverseEntity[] {
    const db = this.getDb();
    const res = db.exec(`SELECT * FROM universes ORDER BY is_system DESC, code ASC`);
    if (!res.length || !res[0].values) return [];
    const columns = res[0].columns;
    return res[0].values.map((v) => {
      const row: any = {};
      columns.forEach((c, idx) => { row[c] = v[idx]; });
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        rulesJson: row.rules_json,
        isSystem: row.is_system === 1,
        memberCount: row.member_count || 0,
        expectedCount: row.expected_count || 0,
        lastRebuiltAt: row.last_rebuilt_at
      };
    });
  }

  getUniverseByCode(code: string): UniverseEntity | null {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM universes WHERE code = ? LIMIT 1`);
    stmt.bind([code.toUpperCase()]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        rulesJson: row.rules_json,
        isSystem: row.is_system === 1,
        memberCount: row.member_count || 0,
        expectedCount: row.expected_count || 0,
        lastRebuiltAt: row.last_rebuilt_at
      };
    }
    stmt.free();
    return null;
  }

  setUniverseMembers(universeId: string, memberIds: string[]): void {
    const db = this.getDb();
    db.run(`DELETE FROM universe_members WHERE universe_id = ?`, [universeId]);

    const now = new Date().toISOString();
    for (const instId of memberIds) {
      db.run(
        `INSERT OR IGNORE INTO universe_members (universe_id, instrument_id, added_at, weight)
         VALUES (?, ?, ?, 0)`,
        [universeId, instId, now]
      );
    }

    db.run(
      `UPDATE universes SET member_count = ?, last_rebuilt_at = ? WHERE id = ?`,
      [memberIds.length, now, universeId]
    );
  }

  getUniverseInstruments(universeCode: string, limit: number = 10000, offset: number = 0): InstrumentEntity[] {
    const db = this.getDb();
    const sql = `
      SELECT i.*
      FROM instruments i
      JOIN universe_members um ON i.id = um.instrument_id
      JOIN universes u ON um.universe_id = u.id
      WHERE u.code = ?
      ORDER BY i.market_cap DESC, i.ticker ASC
      LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(sql);
    stmt.bind([universeCode.toUpperCase(), limit, offset]);

    const results: InstrumentEntity[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push(this.mapInstrumentRow(row));
    }
    stmt.free();
    return results;
  }

  getUniverseMemberTickers(universeCode: string): string[] {
    const db = this.getDb();
    const sql = `
      SELECT i.ticker
      FROM instruments i
      JOIN universe_members um ON i.id = um.instrument_id
      JOIN universes u ON um.universe_id = u.id
      WHERE u.code = ?
      ORDER BY i.market_cap DESC
    `;
    const stmt = db.prepare(sql);
    stmt.bind([universeCode.toUpperCase()]);
    const tickers: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      tickers.push(row.ticker);
    }
    stmt.free();
    return tickers;
  }

  // Index Constituent Tracking (ADD / REMOVE / UPDATE)
  upsertIndexConstituent(c: IndexConstituentEntity): void {
    const db = this.getDb();
    db.run(
      `INSERT INTO index_constituents (id, index_symbol, ticker, company_name, change_type, effective_date, weight, source, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company_name = excluded.company_name,
         change_type = excluded.change_type,
         effective_date = excluded.effective_date,
         weight = excluded.weight,
         source = excluded.source,
         last_updated = excluded.last_updated`,
      [c.id, c.indexSymbol.toUpperCase(), c.ticker.toUpperCase(), c.companyName || null, c.changeType, c.effectiveDate, c.weight, c.source, c.lastUpdated]
    );
  }

  getIndexConstituents(indexSymbol: string): IndexConstituentEntity[] {
    const db = this.getDb();
    const sql = `SELECT * FROM index_constituents WHERE index_symbol = ? ORDER BY weight DESC, ticker ASC`;
    const stmt = db.prepare(sql);
    stmt.bind([indexSymbol.toUpperCase()]);
    const list: IndexConstituentEntity[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      list.push({
        id: row.id,
        indexSymbol: row.index_symbol,
        ticker: row.ticker,
        companyName: row.company_name,
        changeType: row.change_type,
        effectiveDate: row.effective_date,
        weight: row.weight || 0,
        source: row.source,
        lastUpdated: row.last_updated
      });
    }
    stmt.free();
    return list;
  }

  // Count metrics for reporting
  getCounts(): {
    totalInstruments: number;
    activeStocks: number;
    etfCount: number;
    adrCount: number;
    reitCount: number;
    otcCount: number;
    sp500Count: number;
    nasdaq100Count: number;
  } {
    const db = this.getDb();

    const getScalar = (sql: string, params: any[] = []): number => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let val = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        val = Object.values(row)[0] as number;
      }
      stmt.free();
      return val || 0;
    };

    const totalInstruments = getScalar(`SELECT COUNT(*) FROM instruments`);
    const activeStocks = getScalar(`SELECT COUNT(*) FROM instruments WHERE active = 1 AND security_type = 'COMMON_STOCK'`);
    const etfCount = getScalar(`SELECT COUNT(*) FROM instruments WHERE is_etf = 1`);
    const adrCount = getScalar(`SELECT COUNT(*) FROM instruments WHERE is_adr = 1`);
    const reitCount = getScalar(`SELECT COUNT(*) FROM instruments WHERE is_reit = 1`);
    const otcCount = getScalar(`SELECT COUNT(*) FROM instruments WHERE security_type = 'OTC' OR primary_exchange = 'OTC'`);

    const sp500Count = getScalar(`
      SELECT member_count FROM universes WHERE code = 'SP500'
    `);
    const nasdaq100Count = getScalar(`
      SELECT member_count FROM universes WHERE code = 'NASDAQ100'
    `);

    return {
      totalInstruments,
      activeStocks,
      etfCount,
      adrCount,
      reitCount,
      otcCount,
      sp500Count,
      nasdaq100Count
    };
  }

  private mapInstrumentRow(row: any): InstrumentEntity {
    return {
      id: row.id,
      ticker: row.ticker,
      companyName: row.company_name,
      market: row.market,
      locale: row.locale,
      primaryExchange: row.primary_exchange,
      securityType: row.security_type,
      assetClass: row.asset_class,
      currency: row.currency,
      active: row.active === 1,
      cik: row.cik,
      figi: row.figi,
      marketCap: row.market_cap,
      sector: row.sector,
      industry: row.industry,
      isADR: row.is_adr === 1,
      isREIT: row.is_reit === 1,
      isETF: row.is_etf === 1,
      isIndex: row.is_index === 1,
      avgVolume20d: row.avg_volume_20d,
      avgDollarVolume20d: row.avg_dollar_volume_20d,
      lastPrice: row.last_price,
      lastUpdated: row.last_updated,
      source: row.source
    };
  }

  // ==========================================
  // RADAR SCREENING PRESET & RUN OPERATIONS
  // ==========================================

  getAllPresets(): RadarPreset[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM screening_presets ORDER BY is_system DESC, name ASC`);
    const results: RadarPreset[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      try {
        results.push({
          id: row.id,
          name: row.name,
          nameZh: row.name_zh,
          description: row.description,
          mode: row.mode,
          profileType: row.profile_type,
          rules: JSON.parse(row.rules_json),
          rankingWeights: row.ranking_weights_json ? JSON.parse(row.ranking_weights_json) : undefined,
          isSystem: row.is_system === 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      } catch (err) {
        console.error('Failed to parse preset row:', row.id, err);
      }
    }
    stmt.free();
    return results;
  }

  getPresetById(id: string): RadarPreset | undefined {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM screening_presets WHERE id = :id`);
    stmt.bind({ ':id': id });
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      try {
        return {
          id: row.id,
          name: row.name,
          nameZh: row.name_zh,
          description: row.description,
          mode: row.mode,
          profileType: row.profile_type,
          rules: JSON.parse(row.rules_json),
          rankingWeights: row.ranking_weights_json ? JSON.parse(row.ranking_weights_json) : undefined,
          isSystem: row.is_system === 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      } catch {
        return undefined;
      }
    }
    stmt.free();
    return undefined;
  }

  savePreset(preset: RadarPreset): void {
    const db = this.getDb();
    db.run(
      `INSERT OR REPLACE INTO screening_presets (
        id, name, name_zh, description, mode, profile_type,
        rules_json, ranking_weights_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        preset.id,
        preset.name,
        preset.nameZh || preset.name,
        preset.description || '',
        preset.mode || 'PRO',
        preset.profileType || 'CUSTOM',
        JSON.stringify(preset.rules),
        preset.rankingWeights ? JSON.stringify(preset.rankingWeights) : null,
        preset.isSystem ? 1 : 0,
        preset.createdAt || new Date().toISOString(),
        preset.updatedAt || new Date().toISOString()
      ]
    );
    this.save();
  }

  deletePreset(id: string): boolean {
    const db = this.getDb();
    const check = db.prepare(`SELECT is_system FROM screening_presets WHERE id = :id`);
    check.bind({ ':id': id });
    if (check.step()) {
      const row = check.getAsObject() as any;
      check.free();
      if (row.is_system === 1) {
        throw new Error('系统内置策略预设禁止删除');
      }
    } else {
      check.free();
      return false;
    }
    db.run(`DELETE FROM screening_presets WHERE id = ? AND is_system = 0`, [id]);
    this.save();
    return true;
  }

  recordScreeningRun(run: {
    id: string;
    presetId?: string;
    scannedCount: number;
    matchedCount: number;
    executionTimeMs: number;
    marketRegime?: string;
  }): void {
    const db = this.getDb();
    db.run(
      `INSERT INTO screening_runs (
        id, preset_id, scanned_count, matched_count,
        execution_time_ms, market_regime, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.presetId || null,
        run.scannedCount,
        run.matchedCount,
        run.executionTimeMs,
        run.marketRegime || null,
        new Date().toISOString()
      ]
    );
    this.save();
  }

  seedSystemPresets(): void {
    const db = this.getDb();
    for (const preset of SYSTEM_RADAR_PRESETS) {
      db.run(
        `INSERT INTO screening_presets (
          id, name, name_zh, description, mode, profile_type,
          rules_json, ranking_weights_json, is_system, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          name_zh = excluded.name_zh,
          description = excluded.description,
          rules_json = excluded.rules_json,
          ranking_weights_json = excluded.ranking_weights_json,
          updated_at = excluded.updated_at
        WHERE is_system = 1`,
        [
          preset.id,
          preset.name,
          preset.nameZh,
          preset.description,
          preset.mode,
          preset.profileType,
          JSON.stringify(preset.rules),
          preset.rankingWeights ? JSON.stringify(preset.rankingWeights) : null,
          preset.createdAt,
          preset.updatedAt
        ]
      );
    }
    this.save();
  }

  // ==========================================================
  // 1. Watchlist (自选股) SQLite WASM 纯本地持久化
  // ==========================================================
  getWatchlist(): string[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT ticker FROM watchlist_table ORDER BY sort_order ASC, added_at ASC`);
    const list: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { ticker: string };
      if (row.ticker) list.push(row.ticker.toUpperCase());
    }
    stmt.free();
    return list;
  }

  addToWatchlist(ticker: string, notes: string = ''): void {
    const db = this.getDb();
    const norm = ticker.toUpperCase().trim();
    if (!norm) return;
    const nowIso = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO watchlist_table (ticker, added_at, notes, sort_order)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM watchlist_table WHERE ticker != ?))`,
      [norm, nowIso, notes, norm]
    );
    this.save(true);
  }

  removeFromWatchlist(ticker: string): boolean {
    const db = this.getDb();
    const norm = ticker.toUpperCase().trim();
    db.run(`DELETE FROM watchlist_table WHERE ticker = ?`, [norm]);
    this.save(true);
    return true;
  }

  setWatchlist(tickers: string[]): void {
    const db = this.getDb();
    db.run(`DELETE FROM watchlist_table`);
    const nowIso = new Date().toISOString();
    let order = 1;
    for (const t of tickers) {
      const norm = t.toUpperCase().trim();
      if (norm) {
        db.run(
          `INSERT OR REPLACE INTO watchlist_table (ticker, added_at, notes, sort_order) VALUES (?, ?, ?, ?)`,
          [norm, nowIso, '', order++]
        );
      }
    }
    this.save(true);
  }

  seedDefaultWatchlist(defaultTickers: string[] = ['NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR']): void {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT value FROM system_settings WHERE key = 'watchlist_initialized'`);
    let isInitialized = false;
    if (stmt.step()) {
      isInitialized = (stmt.getAsObject() as any).value === '1';
    }
    stmt.free();

    if (!isInitialized) {
      this.setWatchlist(defaultTickers);
      db.run(
        `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('watchlist_initialized', '1', ?)`,
        [new Date().toISOString()]
      );
      this.save(true);
    }
  }

  // ==========================================================
  // 2. Alert Rules & Events (量化预警规则与触发历史) 纯本地持久化
  // ==========================================================
  getAllAlertRules(): AlertRule[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM alert_rules_table ORDER BY created_at ASC`);
    const rules: AlertRule[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const condType = row.condition_type;
      const inferredDim = condType?.startsWith('PRICE') ? 'PRICE' : (condType?.startsWith('CHANGE') ? 'CHANGE_PERCENT' : 'RSI');
      rules.push({
        id: row.id,
        ticker: row.ticker,
        name: row.name,
        stockName: row.name,
        targetDimension: row.target_dimension || inferredDim,
        operator: row.operator || undefined,
        period: Number(row.period || 14),
        timeframe: row.timeframe || '1D',
        conditionType: condType,
        thresholdValue: Number(row.threshold_value),
        thresholdMax: row.threshold_max !== null && row.threshold_max !== undefined ? Number(row.threshold_max) : undefined,
        thresholdSecondary: row.threshold_secondary !== null && row.threshold_secondary !== undefined ? Number(row.threshold_secondary) : undefined,
        isEnabled: Boolean(row.is_enabled),
        state: row.state || undefined,
        triggerFrequency: row.trigger_frequency || 'ONCE_PER_BAR_CLOSE',
        lastTriggeredAt: row.last_triggered_at || undefined,
        lastCheckedRsi: row.last_checked_rsi !== null && row.last_checked_rsi !== undefined ? Number(row.last_checked_rsi) : undefined,
        lastCheckedPrice: row.last_checked_price !== null && row.last_checked_price !== undefined ? Number(row.last_checked_price) : undefined,
        notifySound: row.notify_sound !== null && row.notify_sound !== undefined ? Boolean(row.notify_sound) : true,
        soundType: row.sound_type || 'DIGITAL_CHIME',
        notifyPush: row.notify_push !== null && row.notify_push !== undefined ? Boolean(row.notify_push) : true,
        expireAt: row.expire_at || null,
        alertName: row.alert_name || row.name || undefined,
        customMessage: row.custom_message || undefined,
        triggerCount: Number(row.trigger_count || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }
    stmt.free();
    return rules;
  }

  saveAlertRule(rule: AlertRule): void {
    const db = this.getDb();
    const r = rule as any;
    const condType = r.conditionType || r.type || 'RSI_OVERSOLD';
    const inferredDim = r.targetDimension || (condType.startsWith('PRICE') ? 'PRICE' : condType.startsWith('CHANGE') ? 'CHANGE_PERCENT' : 'RSI');
    db.run(
      `INSERT OR REPLACE INTO alert_rules_table (
        id, ticker, name, period, timeframe, condition_type,
        threshold_value, threshold_max, is_enabled, state,
        trigger_frequency, last_triggered_at, last_checked_rsi,
        created_at, updated_at,
        target_dimension, operator, threshold_secondary,
        notify_sound, sound_type, notify_push, expire_at,
        alert_name, custom_message, trigger_count, last_checked_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        (r.ticker || '').toUpperCase(),
        r.name || r.stockName || r.ticker || '',
        r.period || 14,
        r.timeframe || '1D',
        condType,
        r.thresholdValue ?? r.threshold ?? 30,
        r.thresholdMax !== undefined && r.thresholdMax !== null ? Number(r.thresholdMax) : null,
        (r.isEnabled !== undefined ? r.isEnabled : (r.active !== undefined ? r.active : true)) ? 1 : 0,
        r.state || 'ACTIVE',
        r.triggerFrequency || 'ONCE_PER_BAR_CLOSE',
        r.lastTriggeredAt || null,
        r.lastCheckedRsi !== undefined && r.lastCheckedRsi !== null ? Number(r.lastCheckedRsi) : null,
        r.createdAt || new Date().toISOString(),
        r.updatedAt || new Date().toISOString(),
        inferredDim,
        r.operator || null,
        r.thresholdSecondary !== undefined && r.thresholdSecondary !== null ? Number(r.thresholdSecondary) : null,
        r.notifySound !== false ? 1 : 0,
        r.soundType || 'DIGITAL_CHIME',
        r.notifyPush !== false ? 1 : 0,
        r.expireAt || null,
        r.alertName || r.name || null,
        r.customMessage || null,
        r.triggerCount || 0,
        r.lastCheckedPrice !== undefined && r.lastCheckedPrice !== null ? Number(r.lastCheckedPrice) : null
      ]
    );
    this.save(true);
  }

  deleteAlertRule(id: string): boolean {
    const db = this.getDb();
    db.run(`DELETE FROM alert_rules_table WHERE id = ?`, [id]);
    this.save(true);
    return true;
  }

  getAllAlertEvents(limit: number = 200): AlertEvent[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM alert_events_table ORDER BY triggered_at DESC LIMIT ?`);
    stmt.bind([limit]);
    const events: AlertEvent[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      events.push({
        id: row.id,
        alertId: row.alert_id,
        ticker: row.ticker,
        name: row.name,
        timeframe: row.timeframe || undefined,
        triggeredRsi: row.triggered_rsi !== null && row.triggered_rsi !== undefined ? Number(row.triggered_rsi) : undefined,
        triggeredPrice: row.triggered_price !== null && row.triggered_price !== undefined ? Number(row.triggered_price) : undefined,
        triggeredValue: row.triggered_value !== null && row.triggered_value !== undefined ? Number(row.triggered_value) : undefined,
        targetDimension: row.target_dimension || undefined,
        threshold: Number(row.threshold),
        conditionType: row.condition_type,
        message: row.message,
        triggeredAt: row.triggered_at,
        isRead: Boolean(row.is_read)
      });
    }
    stmt.free();
    return events;
  }

  saveAlertEvent(event: AlertEvent): void {
    const db = this.getDb();
    const e = event as any;
    db.run(
      `INSERT OR REPLACE INTO alert_events_table (
        id, alert_id, ticker, name, timeframe,
        triggered_rsi, triggered_price, triggered_value, target_dimension,
        threshold, condition_type, message,
        triggered_at, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        e.alertId || e.alert_id || '',
        (e.ticker || '').toUpperCase(),
        e.name || e.ticker || '',
        e.timeframe || null,
        e.triggeredRsi !== undefined && e.triggeredRsi !== null ? Number(e.triggeredRsi) : null,
        e.triggeredPrice !== undefined && e.triggeredPrice !== null ? Number(e.triggeredPrice) : null,
        e.triggeredValue !== undefined && e.triggeredValue !== null ? Number(e.triggeredValue) : null,
        e.targetDimension || null,
        e.threshold ?? 0,
        e.conditionType ?? e.condition_type ?? 'RSI_OVERSOLD',
        e.message || '',
        e.triggeredAt || e.triggered_at || new Date().toISOString(),
        (e.isRead !== undefined ? e.isRead : e.is_read) ? 1 : 0
      ]
    );
    this.save(true);
  }

  markAlertEventAsRead(id: string): boolean {
    const db = this.getDb();
    db.run(`UPDATE alert_events_table SET is_read = 1 WHERE id = ?`, [id]);
    this.save(true);
    return true;
  }

  clearAllAlertEvents(): void {
    const db = this.getDb();
    db.run(`DELETE FROM alert_events_table`);
    this.save(true);
  }

  seedDefaultAlertRules(defaultRules: AlertRule[]): void {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT value FROM system_settings WHERE key = 'alert_rules_initialized'`);
    let isInitialized = false;
    if (stmt.step()) {
      isInitialized = (stmt.getAsObject() as any).value === '1';
    }
    stmt.free();

    if (!isInitialized) {
      for (const rule of defaultRules) {
        this.saveAlertRule(rule);
      }
      db.run(
        `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('alert_rules_initialized', '1', ?)`,
        [new Date().toISOString()]
      );
      this.save(true);
    }
  }

  seedDefaultAlertEvents(defaultEvents: AlertEvent[]): void {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT value FROM system_settings WHERE key = 'alert_events_initialized'`);
    let isInitialized = false;
    if (stmt.step()) {
      isInitialized = (stmt.getAsObject() as any).value === '1';
    }
    stmt.free();

    if (!isInitialized) {
      for (const evt of defaultEvents) {
        this.saveAlertEvent(evt);
      }
      db.run(
        `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('alert_events_initialized', '1', ?)`,
        [new Date().toISOString()]
      );
      this.save(true);
    }
  }

  // ==========================================================
  // 3. Paper Trading Positions, Orders & Account 纯本地持久化
  // ==========================================================
  getAllPaperPositions(): BrokerPosition[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM paper_positions_table ORDER BY opened_at DESC`);
    const positions: BrokerPosition[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      positions.push({
        symbol: row.symbol,
        qty: Number(row.qty),
        avgEntryPrice: Number(row.avg_entry_price),
        currentPrice: Number(row.current_price),
        marketValue: Number(row.market_value),
        costBasis: Number(row.cost_basis),
        unrealizedPnL: Number(row.unrealized_pnl),
        unrealizedPnLPercent: Number(row.unrealized_pnl_percent),
        takeProfitPrice: row.take_profit_price !== null && row.take_profit_price !== undefined ? Number(row.take_profit_price) : undefined,
        stopLossPrice: row.stop_loss_price !== null && row.stop_loss_price !== undefined ? Number(row.stop_loss_price) : undefined,
        trailingStopPrice: row.trailing_stop_price !== null && row.trailing_stop_price !== undefined ? Number(row.trailing_stop_price) : undefined,
        highestPriceSinceEntry: row.highest_price_since_entry !== null && row.highest_price_since_entry !== undefined ? Number(row.highest_price_since_entry) : undefined,
        breakEvenActive: Boolean(row.break_even_active),
        openedAt: row.opened_at
      });
    }
    stmt.free();
    return positions;
  }

  getPaperPosition(symbol: string): BrokerPosition | null {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM paper_positions_table WHERE symbol = ? LIMIT 1`);
    stmt.bind([symbol.toUpperCase().trim()]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        symbol: row.symbol,
        qty: Number(row.qty),
        avgEntryPrice: Number(row.avg_entry_price),
        currentPrice: Number(row.current_price),
        marketValue: Number(row.market_value),
        costBasis: Number(row.cost_basis),
        unrealizedPnL: Number(row.unrealized_pnl),
        unrealizedPnLPercent: Number(row.unrealized_pnl_percent),
        takeProfitPrice: row.take_profit_price !== null && row.take_profit_price !== undefined ? Number(row.take_profit_price) : undefined,
        stopLossPrice: row.stop_loss_price !== null && row.stop_loss_price !== undefined ? Number(row.stop_loss_price) : undefined,
        trailingStopPrice: row.trailing_stop_price !== null && row.trailing_stop_price !== undefined ? Number(row.trailing_stop_price) : undefined,
        highestPriceSinceEntry: row.highest_price_since_entry !== null && row.highest_price_since_entry !== undefined ? Number(row.highest_price_since_entry) : undefined,
        breakEvenActive: Boolean(row.break_even_active),
        openedAt: row.opened_at
      };
    }
    stmt.free();
    return null;
  }

  savePaperPosition(pos: BrokerPosition): void {
    const db = this.getDb();
    const nowIso = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO paper_positions_table (
        symbol, qty, avg_entry_price, current_price, market_value,
        cost_basis, unrealized_pnl, unrealized_pnl_percent,
        take_profit_price, stop_loss_price, trailing_stop_price,
        highest_price_since_entry, break_even_active, opened_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pos.symbol.toUpperCase().trim(),
        pos.qty,
        pos.avgEntryPrice,
        pos.currentPrice,
        pos.marketValue,
        pos.costBasis,
        pos.unrealizedPnL,
        pos.unrealizedPnLPercent,
        pos.takeProfitPrice !== undefined ? pos.takeProfitPrice : null,
        pos.stopLossPrice !== undefined ? pos.stopLossPrice : null,
        pos.trailingStopPrice !== undefined ? pos.trailingStopPrice : null,
        pos.highestPriceSinceEntry !== undefined ? pos.highestPriceSinceEntry : null,
        pos.breakEvenActive ? 1 : 0,
        pos.openedAt || nowIso,
        nowIso
      ]
    );
    this.save(true);
  }

  deletePaperPosition(symbol: string): boolean {
    const db = this.getDb();
    db.run(`DELETE FROM paper_positions_table WHERE symbol = ?`, [symbol.toUpperCase().trim()]);
    this.save(true);
    return true;
  }

  clearAllPaperPositions(): void {
    const db = this.getDb();
    db.run(`DELETE FROM paper_positions_table`);
    this.save(true);
  }

  getAllPaperOrders(limit: number = 500): BrokerOrder[] {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM paper_orders_table ORDER BY created_at DESC LIMIT ?`);
    stmt.bind([limit]);
    const orders: BrokerOrder[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      orders.push({
        id: row.id,
        symbol: row.symbol,
        side: row.side,
        orderType: row.order_type,
        orderClass: row.order_class,
        qty: Number(row.qty),
        limitPrice: row.limit_price !== null && row.limit_price !== undefined ? Number(row.limit_price) : undefined,
        stopLossPrice: row.stop_loss_price !== null && row.stop_loss_price !== undefined ? Number(row.stop_loss_price) : undefined,
        takeProfitPrice: row.take_profit_price !== null && row.take_profit_price !== undefined ? Number(row.take_profit_price) : undefined,
        filledPrice: row.filled_price !== null && row.filled_price !== undefined ? Number(row.filled_price) : undefined,
        status: row.status,
        strategySource: row.strategy_source || undefined,
        createdAt: row.created_at,
        filledAt: row.filled_at || undefined,
        cancelledAt: row.cancelled_at || undefined,
        notes: row.notes || undefined
      });
    }
    stmt.free();
    return orders;
  }

  savePaperOrder(order: BrokerOrder): void {
    const db = this.getDb();
    db.run(
      `INSERT OR REPLACE INTO paper_orders_table (
        id, symbol, side, order_type, order_class, qty,
        limit_price, stop_loss_price, take_profit_price, filled_price,
        status, strategy_source, created_at, filled_at, cancelled_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.symbol.toUpperCase().trim(),
        order.side,
        order.orderType,
        order.orderClass,
        order.qty,
        order.limitPrice !== undefined ? order.limitPrice : null,
        order.stopLossPrice !== undefined ? order.stopLossPrice : null,
        order.takeProfitPrice !== undefined ? order.takeProfitPrice : null,
        order.filledPrice !== undefined ? order.filledPrice : null,
        order.status,
        order.strategySource || null,
        order.createdAt || new Date().toISOString(),
        order.filledAt || null,
        order.cancelledAt || null,
        order.notes || null
      ]
    );
    this.save(true);
  }

  clearAllPaperOrders(): void {
    const db = this.getDb();
    db.run(`DELETE FROM paper_orders_table`);
    this.save(true);
  }

  getPaperAccountSummary(defaultBalance: number = 100000.0): { cash: number; initialBalance: number; realizedPnL: number } {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM paper_account_table WHERE id = 'default' LIMIT 1`);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        cash: Number(row.cash),
        initialBalance: Number(row.initial_balance),
        realizedPnL: Number(row.realized_pnl)
      };
    }
    stmt.free();
    const nowIso = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO paper_account_table (id, cash, initial_balance, realized_pnl, updated_at) VALUES ('default', ?, ?, 0.0, ?)`,
      [defaultBalance, defaultBalance, nowIso]
    );
    this.save(true);
    return { cash: defaultBalance, initialBalance: defaultBalance, realizedPnL: 0.0 };
  }

  savePaperAccountSummary(acc: { cash: number; initialBalance: number; realizedPnL: number }): void {
    const db = this.getDb();
    const nowIso = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO paper_account_table (id, cash, initial_balance, realized_pnl, updated_at) VALUES ('default', ?, ?, ?, ?)`,
      [acc.cash, acc.initialBalance, acc.realizedPnL, nowIso]
    );
    this.save(true);
  }

  resetPaperAccountData(newBalance: number = 100000.0): void {
    this.clearAllPaperPositions();
    this.clearAllPaperOrders();
    this.savePaperAccountSummary({ cash: newBalance, initialBalance: newBalance, realizedPnL: 0.0 });
  }

  // ==========================================================
  // 4. System Settings (KeyValue) 纯本地持久化
  // ==========================================================
  getSystemSetting(key: string): string | null {
    if (!this.isInitialized()) return null;
    const db = this.getDb();
    const stmt = db.prepare(`SELECT value FROM system_settings WHERE key = ?`);
    try {
      stmt.bind([key]);
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return (row.value as string) || null;
      }
      return null;
    } finally {
      stmt.free();
    }
  }

  setSystemSetting(key: string, value: string): void {
    if (!this.isInitialized()) return;
    const db = this.getDb();
    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, new Date().toISOString()]
    );
    this.scheduleSave();
  }
}

export const universeDb = new UniverseDatabase();
