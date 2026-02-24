import { NextResponse } from 'next/server'

async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

export async function GET() {
  const result: Record<string, unknown> = { timestamp: new Date().toISOString() }

  // Forex — Swissquote (real-time bid/ask)
  let cadRate = 1.44
  try {
    const SQ = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument'
    const [cadData, cnhData, jpyData, eurData, gbpData, sekData, chfData] = await Promise.all([
      fetchJSON(`${SQ}/USD/CAD`),
      fetchJSON(`${SQ}/USD/CNH`),
      fetchJSON(`${SQ}/USD/JPY`),
      fetchJSON(`${SQ}/EUR/USD`),
      fetchJSON(`${SQ}/GBP/USD`),
      fetchJSON(`${SQ}/USD/SEK`),
      fetchJSON(`${SQ}/USD/CHF`),
    ])
    const mid = (d: unknown[]) => {
      const p = (d[0] as Record<string, unknown>)?.spreadProfilePrices as { bid: number; ask: number }[] | undefined
      if (!p?.[0]) return null
      return (p[0].bid + p[0].ask) / 2
    }
    const usdCAD = mid(cadData)
    const usdCNH = mid(cnhData)
    const usdJPY = mid(jpyData)
    const eurUSD = mid(eurData)
    const gbpUSD = mid(gbpData)
    const usdSEK = mid(sekData)
    const usdCHF = mid(chfData)
    if (usdCAD) cadRate = usdCAD

    // ICE US Dollar Index (DXY) formula
    let dxy: number | null = null
    if (eurUSD && usdJPY && gbpUSD && usdCAD && usdSEK && usdCHF) {
      dxy = Math.round(50.14348112
        * Math.pow(eurUSD, -0.576)
        * Math.pow(usdJPY, 0.136)
        * Math.pow(gbpUSD, -0.119)
        * Math.pow(usdCAD, 0.091)
        * Math.pow(usdSEK, 0.042)
        * Math.pow(usdCHF, 0.036)
        * 1000) / 1000
    }

    result.forex = {
      dxy,
      usdCAD: usdCAD ? Math.round(usdCAD * 10000) / 10000 : null,
      usdCNY: usdCNH ? Math.round(usdCNH * 10000) / 10000 : null,
      cadCNY: usdCNH && usdCAD ? Math.round((usdCNH / usdCAD) * 10000) / 10000 : null,
      usdJPY: usdJPY ? Math.round(usdJPY * 100) / 100 : null,
      eurUSD: eurUSD ? Math.round(eurUSD * 10000) / 10000 : null,
    }
  } catch (e: unknown) {
    result.forex = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Crypto — Coinbase Exchange
  try {
    const [btc, eth] = await Promise.all([
      fetchJSON('https://api.exchange.coinbase.com/products/BTC-USD/stats'),
      fetchJSON('https://api.exchange.coinbase.com/products/ETH-USD/stats'),
    ])
    const btcUSD = parseFloat(btc.last)
    const ethUSD = parseFloat(eth.last)
    const btcOpen = parseFloat(btc.open)
    const ethOpen = parseFloat(eth.open)
    result.crypto = {
      btcUSD,
      ethUSD,
      btcCAD: Math.round(btcUSD * cadRate * 100) / 100,
      ethCAD: Math.round(ethUSD * cadRate * 100) / 100,
      btcChange: Math.round(((btcUSD - btcOpen) / btcOpen) * 10000) / 100,
      ethChange: Math.round(((ethUSD - ethOpen) / ethOpen) * 10000) / 100,
    }
  } catch (e: unknown) {
    result.crypto = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Metals — Swissquote
  try {
    const [goldData, silverData] = await Promise.all([
      fetchJSON('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD'),
      fetchJSON('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD'),
    ])
    const goldBid = goldData[0]?.spreadProfilePrices?.[0]?.bid
    const goldAsk = goldData[0]?.spreadProfilePrices?.[0]?.ask
    const silverBid = silverData[0]?.spreadProfilePrices?.[0]?.bid
    const silverAsk = silverData[0]?.spreadProfilePrices?.[0]?.ask
    result.metals = {
      goldPrice: goldBid && goldAsk ? Math.round(((goldBid + goldAsk) / 2) * 100) / 100 : null,
      silverPrice: silverBid && silverAsk ? Math.round(((silverBid + silverAsk) / 2) * 1000) / 1000 : null,
      goldChange: null,
      silverChange: null,
    }
  } catch (e: unknown) {
    result.metals = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Volatility — CBOE
  try {
    const [vixData, vxnData] = await Promise.all([
      fetchJSON('https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json'),
      fetchJSON('https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VXN.json'),
    ])
    result.volatility = {
      vix: vixData.data.current_price,
      vixChange: vixData.data.price_change_percent || null,
      vxn: vxnData.data.current_price,
      vxnChange: vxnData.data.price_change_percent || null,
    }
  } catch (e: unknown) {
    result.volatility = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Brent Oil — EIA (daily, free demo key)
  try {
    const oilData = await fetchJSON(
      'https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=DEMO_KEY&frequency=daily&data[0]=value&facets[product][]=EPCBRENT&sort[0][column]=period&sort[0][direction]=desc&length=2'
    )
    const rows = oilData.response?.data
    if (rows && rows.length > 0) {
      const latest = parseFloat(rows[0].value)
      const prev = rows.length > 1 ? parseFloat(rows[1].value) : null
      result.oil = {
        brentPrice: latest,
        brentChange: prev ? Math.round(((latest - prev) / prev) * 10000) / 100 : null,
        brentDate: rows[0].period,
      }
    } else {
      result.oil = { error: 'No data' }
    }
  } catch (e: unknown) {
    result.oil = { error: e instanceof Error ? e.message : 'Failed' }
  }

  return NextResponse.json(result)
}
