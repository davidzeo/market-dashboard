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

  // Crypto
  try {
    const cryptoData = await fetchJSON(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
    )
    const btcUSD = cryptoData.bitcoin.usd
    const ethUSD = cryptoData.ethereum.usd
    result.crypto = {
      btcUSD,
      ethUSD,
      btcCAD: Math.round(btcUSD * cadRate * 100) / 100,
      ethCAD: Math.round(ethUSD * cadRate * 100) / 100,
      btcChange: cryptoData.bitcoin.usd_24h_change ?? null,
      ethChange: cryptoData.ethereum.usd_24h_change ?? null,
    }
  } catch (e: unknown) {
    result.crypto = { error: e instanceof Error ? e.message : 'Failed' }
  }

  // Metals — this one can be flaky from serverless
  try {
    const metalsData = await fetchJSON('https://data-asg.goldprice.org/dbXRates/USD')
    const item = metalsData.items?.[0]
    result.metals = {
      goldPrice: item?.xauPrice ?? null,
      silverPrice: item?.xagPrice ?? null,
      goldChange: item?.pcXau ?? null,
      silverChange: item?.pcXag ?? null,
    }
  } catch (e: unknown) {
    result.metals = { error: e instanceof Error ? e.message : 'Failed' }
  }

  return NextResponse.json(result)
}
