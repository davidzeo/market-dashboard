import { NextResponse } from 'next/server'

interface MarketData {
  crypto: {
    btcUSD: number; ethUSD: number
    btcCAD: number; ethCAD: number
    btcChange: number | null; ethChange: number | null
  }
  forex: {
    usdCAD: number; usdCNY: number; cadCNY: number
    usdJPY: number; eurUSD: number
  }
  metals: {
    goldPrice: number; silverPrice: number
    goldChange: number | null; silverChange: number | null
  }
  timestamp: string
}

async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const [forexData, cryptoData, metalsData] = await Promise.all([
      fetchJSON('https://open.er-api.com/v6/latest/USD'),
      fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'),
      fetchJSON('https://data-asg.goldprice.org/dbXRates/USD'),
    ])

    const cadRate = forexData.rates.CAD
    const cnyRate = forexData.rates.CNY
    const jpyRate = forexData.rates.JPY
    const eurRate = forexData.rates.EUR

    const btcUSD = cryptoData.bitcoin.usd
    const ethUSD = cryptoData.ethereum.usd

    const metal = metalsData.items?.[0]

    const data: MarketData = {
      crypto: {
        btcUSD,
        ethUSD,
        btcCAD: Math.round(btcUSD * cadRate * 100) / 100,
        ethCAD: Math.round(ethUSD * cadRate * 100) / 100,
        btcChange: cryptoData.bitcoin.usd_24h_change ?? null,
        ethChange: cryptoData.ethereum.usd_24h_change ?? null,
      },
      forex: {
        usdCAD: cadRate,
        usdCNY: cnyRate,
        cadCNY: Math.round((cnyRate / cadRate) * 10000) / 10000,
        usdJPY: jpyRate,
        eurUSD: Math.round((1 / eurRate) * 10000) / 10000,
      },
      metals: {
        goldPrice: metal?.xauPrice ?? null,
        silverPrice: metal?.xagPrice ?? null,
        goldChange: metal?.pcXau ?? null,
        silverChange: metal?.pcXag ?? null,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
