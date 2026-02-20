import { NextResponse } from 'next/server'

async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

export async function GET() {
  const result: Record<string, unknown> = { timestamp: new Date().toISOString() }

  // Forex — usually reliable
  let cadRate = 1.44
  try {
    const forexData = await fetchJSON('https://open.er-api.com/v6/latest/USD')
    const r = forexData.rates
    cadRate = r.CAD
    result.forex = {
      usdCAD: r.CAD,
      usdCNY: r.CNY,
      cadCNY: Math.round((r.CNY / r.CAD) * 10000) / 10000,
      usdJPY: r.JPY,
      eurUSD: Math.round((1 / r.EUR) * 10000) / 10000,
    }
  } catch (e: unknown) {
    result.forex = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Crypto — Coinbase Exchange (US-based, no API key, no geo-blocking)
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

  // Metals — Swissquote free feed (no API key, serverless-friendly)
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

  return NextResponse.json(result)
}
