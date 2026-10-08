import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Fetching official Wikipedia S&P 500 constituents...');
  const spRes = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&prop=wikitext&format=json', {
    headers: { 'User-Agent': 'USStockApp/1.0 (quant@test.com)' }
  });
  const spJson = await spRes.json();
  const spText = spJson?.parse?.wikitext?.['*'] || '';
  const spLines = spText.split('\n');
  const spTableIdx = spLines.findIndex(l => l.includes('wikitable sortable') && l.includes('constituents'));
  
  const spRows = [];
  let curRow = [];
  for (let i = spTableIdx; i < spLines.length; i++) {
    const line = spLines[i].trim();
    if (line.startsWith('{|')) continue;
    if (line.startsWith('|}')) break;
    if (line.startsWith('|-')) {
      if (curRow.length >= 3) {
        const rawSymbol = curRow[0] || '';
        const match = rawSymbol.match(/(?:\{\{NyseSymbol\||\{\{NasdaqSymbol\||\[\[)?([A-Z0-9.\-]+)/i);
        const rawTicker = match ? match[1].replace(/[\{\}\[\]]/g, '').trim().toUpperCase() : '';
        const rawName = (curRow[1] || '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/^\|\s*/, '').trim();
        const rawSector = (curRow[2] || '').replace(/^\|\s*/, '').trim();
        const rawIndustry = (curRow[3] || '').replace(/^\|\s*/, '').trim();
        const cikMatch = (curRow[6] || '').match(/\d+/);
        const cik = cikMatch ? cikMatch[0] : '';
        const isReit = rawIndustry.toLowerCase().includes('reit') || rawSector.toLowerCase().includes('real estate');
        const exchange = rawSymbol.toLowerCase().includes('nasdaq') ? 'NASDAQ' : 'NYSE';
        if (rawTicker && rawTicker.length <= 6) {
          spRows.push({
            ticker: rawTicker.replace('.', '-'),
            name: rawName || rawTicker,
            sector: rawSector || 'General',
            industry: rawIndustry || 'General',
            exchange,
            cik,
            isREIT: isReit
          });
        }
      }
      curRow = [];
      continue;
    }
    if (line.startsWith('|')) {
      curRow.push(line.replace(/^\|\s*/, ''));
    }
  }

  console.log(`Successfully parsed ${spRows.length} S&P 500 constituents.`);

  // 101 Nasdaq 100 Official Constituents
  const ndxList = [
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical', industry: 'Internet Retail' },
    { ticker: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services', industry: 'Internet Content' },
    { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', sector: 'Communication Services', industry: 'Internet Content' },
    { ticker: 'GOOG', name: 'Alphabet Inc. (Class C)', sector: 'Communication Services', industry: 'Internet Content' },
    { ticker: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer Defensive', industry: 'Discount Stores' },
    { ticker: 'NFLX', name: 'Netflix, Inc.', sector: 'Communication Services', industry: 'Entertainment' },
    { ticker: 'AMD', name: 'Advanced Micro Devices, Inc.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'PEP', name: 'PepsiCo, Inc.', sector: 'Consumer Defensive', industry: 'Beverages' },
    { ticker: 'TMUS', name: 'T-Mobile US, Inc.', sector: 'Communication Services', industry: 'Telecom Services' },
    { ticker: 'LIN', name: 'Linde plc', sector: 'Basic Materials', industry: 'Specialty Chemicals' },
    { ticker: 'CSCO', name: 'Cisco Systems, Inc.', sector: 'Technology', industry: 'Communication Equipment' },
    { ticker: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'QCOM', name: 'QUALCOMM Incorporated', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AMAT', name: 'Applied Materials, Inc.', sector: 'Technology', industry: 'Semiconductor Equipment' },
    { ticker: 'INTU', name: 'Intuit Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'TXN', name: 'Texas Instruments Incorporated', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'ISRG', name: 'Intuitive Surgical, Inc.', sector: 'Healthcare', industry: 'Medical Instruments' },
    { ticker: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Telecom Services' },
    { ticker: 'HON', name: 'Honeywell International Inc.', sector: 'Industrials', industry: 'Conglomerates' },
    { ticker: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer Cyclical', industry: 'Travel Services' },
    { ticker: 'VRTX', name: 'Vertex Pharmaceuticals Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'GILD', name: 'Gilead Sciences, Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'LRCX', name: 'Lam Research Corporation', sector: 'Technology', industry: 'Semiconductor Equipment' },
    { ticker: 'PANW', name: 'Palo Alto Networks, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'REGN', name: 'Regeneron Pharmaceuticals, Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'ADP', name: 'Automatic Data Processing, Inc.', sector: 'Industrials', industry: 'Staffing & Employment Services' },
    { ticker: 'MDLZ', name: 'Mondelez International, Inc.', sector: 'Consumer Defensive', industry: 'Confectioners' },
    { ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Cyclical', industry: 'Restaurants' },
    { ticker: 'SNPS', name: 'Synopsys, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'CDNS', name: 'Cadence Design Systems, Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'MU', name: 'Micron Technology, Inc.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'KLAC', name: 'KLA Corporation', sector: 'Technology', industry: 'Semiconductor Equipment' },
    { ticker: 'MELI', name: 'MercadoLibre, Inc.', sector: 'Consumer Cyclical', industry: 'Internet Retail' },
    { ticker: 'PYPL', name: 'PayPal Holdings, Inc.', sector: 'Financial Services', industry: 'Credit Services' },
    { ticker: 'CRWD', name: 'CrowdStrike Holdings, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'ABNB', name: 'Airbnb, Inc.', sector: 'Consumer Cyclical', industry: 'Travel Services' },
    { ticker: 'ORLY', name: "O'Reilly Automotive, Inc.", sector: 'Consumer Cyclical', industry: 'Auto Parts' },
    { ticker: 'CTAS', name: 'Cintas Corporation', sector: 'Industrials', industry: 'Specialty Business Services' },
    { ticker: 'MAR', name: 'Marriott International, Inc.', sector: 'Consumer Cyclical', industry: 'Lodging' },
    { ticker: 'CEG', name: 'Constellation Energy Corporation', sector: 'Utilities', industry: 'Utilities - Independent Power' },
    { ticker: 'NXPI', name: 'NXP Semiconductors N.V.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'PCAR', name: 'PACCAR Inc', sector: 'Industrials', industry: 'Farm & Heavy Machinery' },
    { ticker: 'CSX', name: 'CSX Corporation', sector: 'Industrials', industry: 'Railroads' },
    { ticker: 'ASML', name: 'ASML Holding N.V.', sector: 'Technology', industry: 'Semiconductor Equipment' },
    { ticker: 'DXCM', name: 'DexCom, Inc.', sector: 'Healthcare', industry: 'Medical Devices' },
    { ticker: 'FTNT', name: 'Fortinet, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'MRVL', name: 'Marvell Technology, Inc.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'ADI', name: 'Analog Devices, Inc.', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'WBD', name: 'Warner Bros. Discovery, Inc.', sector: 'Communication Services', industry: 'Entertainment' },
    { ticker: 'CPRT', name: 'Copart, Inc.', sector: 'Consumer Cyclical', industry: 'Auto & Truck Dealerships' },
    { ticker: 'MNST', name: 'Monster Beverage Corporation', sector: 'Consumer Defensive', industry: 'Beverages' },
    { ticker: 'KDP', name: 'Keurig Dr Pepper Inc.', sector: 'Consumer Defensive', industry: 'Beverages' },
    { ticker: 'ROST', name: 'Ross Stores, Inc.', sector: 'Consumer Cyclical', industry: 'Apparel Retail' },
    { ticker: 'MCHP', name: 'Microchip Technology Incorporated', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'CHTR', name: 'Charter Communications, Inc.', sector: 'Communication Services', industry: 'Telecom Services' },
    { ticker: 'FAST', name: 'Fastenal Company', sector: 'Industrials', industry: 'Industrial Distribution' },
    { ticker: 'PAYX', name: 'Paychex, Inc.', sector: 'Industrials', industry: 'Staffing & Employment Services' },
    { ticker: 'KHC', name: 'The Kraft Heinz Company', sector: 'Consumer Defensive', industry: 'Packaged Foods' },
    { ticker: 'ODFL', name: 'Old Dominion Freight Line, Inc.', sector: 'Industrials', industry: 'Trucking' },
    { ticker: 'IDXX', name: 'IDEXX Laboratories, Inc.', sector: 'Healthcare', industry: 'Diagnostics & Research' },
    { ticker: 'VRSK', name: 'Verisk Analytics, Inc.', sector: 'Industrials', industry: 'Consulting Services' },
    { ticker: 'EXC', name: 'Exelon Corporation', sector: 'Utilities', industry: 'Utilities - Regulated Electric' },
    { ticker: 'GEHC', name: 'GE HealthCare Technologies Inc.', sector: 'Healthcare', industry: 'Medical Devices' },
    { ticker: 'LULU', name: 'Lululemon Athletica Inc.', sector: 'Consumer Cyclical', industry: 'Apparel Retail' },
    { ticker: 'BIIB', name: 'Biogen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'TEAM', name: 'Atlassian Corporation', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'ON', name: 'ON Semiconductor Corporation', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'CDW', name: 'CDW Corporation', sector: 'Technology', industry: 'Information Technology Services' },
    { ticker: 'CSGP', name: 'CoStar Group, Inc.', sector: 'Real Estate', industry: 'Real Estate Services' },
    { ticker: 'ZS', name: 'Zscaler, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'ANSS', name: 'ANSYS, Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'DLTR', name: 'Dollar Tree, Inc.', sector: 'Consumer Defensive', industry: 'Discount Stores' },
    { ticker: 'TTWO', name: 'Take-Two Interactive Software, Inc.', sector: 'Communication Services', industry: 'Electronic Gaming' },
    { ticker: 'ILMN', name: 'Illumina, Inc.', sector: 'Healthcare', industry: 'Diagnostics & Research' },
    { ticker: 'MRNA', name: 'Moderna, Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
    { ticker: 'WBA', name: 'Walgreens Boots Alliance, Inc.', sector: 'Healthcare', industry: 'Pharmaceutical Retailers' },
    { ticker: 'SIRI', name: 'Sirius XM Holdings Inc.', sector: 'Communication Services', industry: 'Broadcasting' },
    { ticker: 'ARM', name: 'Arm Holdings plc', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'SMCI', name: 'Super Micro Computer, Inc.', sector: 'Technology', industry: 'Computer Hardware' },
    { ticker: 'DASH', name: 'DoorDash, Inc.', sector: 'Consumer Cyclical', industry: 'Internet Retail' },
    { ticker: 'MDB', name: 'MongoDB, Inc.', sector: 'Technology', industry: 'Software - Infrastructure' },
    { ticker: 'TTD', name: 'The Trade Desk, Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'ROP', name: 'Roper Technologies, Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'BKR', name: 'Baker Hughes Company', sector: 'Energy', industry: 'Oil & Gas Equipment' },
    { ticker: 'FANG', name: 'Diamondback Energy, Inc.', sector: 'Energy', industry: 'Oil & Gas E&P' },
    { ticker: 'WDAY', name: 'Workday, Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'APP', name: 'AppLovin Corporation', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'PLTR', name: 'Palantir Technologies Inc.', sector: 'Technology', industry: 'Software - Application' },
    { ticker: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
    { ticker: 'AXON', name: 'Axon Enterprise, Inc.', sector: 'Industrials', industry: 'Aerospace & Defense' },
    { ticker: 'CCEP', name: 'Coca-Cola Europacific Partners plc', sector: 'Consumer Defensive', industry: 'Beverages' }
  ];

  console.log(`Prepared ${ndxList.length} Nasdaq 100 constituents.`);

  const outDir = path.resolve('server/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'official_sp500.json'), JSON.stringify(spRows, null, 2));
  fs.writeFileSync(path.join(outDir, 'official_ndx100.json'), JSON.stringify(ndxList, null, 2));
  console.log('Saved official_sp500.json and official_ndx100.json');
}

main().catch(console.error);
