'use client'

import { useEffect, useState, useCallback } from 'react'

interface MarketData {
  crypto: { btcUSD: number; ethUSD: number; btcCAD: number; ethCAD: number; btcChange: number | null; ethChange: number | null; error?: string }
  forex: { dxy: number | null; usdCAD: number; usdCNY: number; cadCNY: number; usdJPY: number; eurUSD: number; error?: string }
  metals: { goldPrice: number; silverPrice: number; goldChange: number | null; silverChange: number | null; error?: string }
  volatility: { vix: number; vixChange: number | null; vxn: number; vxnChange: number | null; error?: string }
  oil: { brentPrice: number; brentChange: number | null; brentDate: string; error?: string }
  timestamp: string
}

const REFRESH_MS = 3 * 60 * 1000

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function Change({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return null
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : ''
  const sign = pct > 0 ? '+' : ''
  return <span className={`change ${cls}`}>{sign}{pct.toFixed(2)}%</span>
}

function Item({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <div className="item">
      <span className="label">{label}</span>
      <span className="value">{value}<Change pct={change} /></span>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<MarketData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
      setUpdatedAt(new Date().toLocaleString())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fetch failed'
      setError(msg)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchData])

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Market Dashboard</h1>
        <div className="updated">
          {error ? <span className="error-text">Error: {error}</span> : updatedAt ? `Updated: ${updatedAt}` : 'Loading...'}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-title">🪙 Crypto</div>
          {!data ? <div className="loading-text">Fetching...</div>
            : data.crypto.error ? <div className="error-text">{data.crypto.error}</div>
            : <>
                <Item label="BTC/CAD" value={'$' + fmt(data.crypto.btcCAD, 0)} change={data.crypto.btcChange} />
                <Item label="ETH/CAD" value={'$' + fmt(data.crypto.ethCAD, 2)} change={data.crypto.ethChange} />
                <Item label="BTC/USD" value={'$' + fmt(data.crypto.btcUSD, 0)} />
                <Item label="ETH/USD" value={'$' + fmt(data.crypto.ethUSD, 2)} />
              </>
          }
        </div>

        <div className="card">
          <div className="card-title">💱 Forex</div>
          {!data ? <div className="loading-text">Fetching...</div>
            : data.forex.error ? <div className="error-text">{data.forex.error}</div>
            : <>
                <Item label="USD Index" value={fmt(data.forex.dxy, 3)} />
                <Item label="USD/CAD" value={fmt(data.forex.usdCAD, 4)} />
                <Item label="USD/CNY" value={fmt(data.forex.usdCNY, 4)} />
                <Item label="CAD/CNY" value={fmt(data.forex.cadCNY, 4)} />
                <Item label="USD/JPY" value={fmt(data.forex.usdJPY, 2)} />
                <Item label="EUR/USD" value={fmt(data.forex.eurUSD, 4)} />
              </>
          }
        </div>

        <div className="card">
          <div className="card-title">🥇 Metals (USD/oz)</div>
          {!data ? <div className="loading-text">Fetching...</div>
            : data.metals.error ? <div className="error-text">{data.metals.error}</div>
            : <>
                <Item label="Gold" value={'$' + fmt(data.metals.goldPrice, 2)} change={data.metals.goldChange} />
                <Item label="Silver" value={'$' + fmt(data.metals.silverPrice, 2)} change={data.metals.silverChange} />
              </>
          }
        </div>

        <div className="card">
          <div className="card-title">📈 Volatility</div>
          {!data ? <div className="loading-text">Fetching...</div>
            : data.volatility.error ? <div className="error-text">{data.volatility.error}</div>
            : <>
                <Item label="VIX" value={fmt(data.volatility.vix, 2)} change={data.volatility.vixChange} />
                <Item label="VXN" value={fmt(data.volatility.vxn, 2)} change={data.volatility.vxnChange} />
              </>
          }
        </div>

        <div className="card">
          <div className="card-title">🛢️ Oil</div>
          {!data ? <div className="loading-text">Fetching...</div>
            : data.oil.error ? <div className="error-text">{data.oil.error}</div>
            : <>
                <Item label="Brent Crude" value={'$' + fmt(data.oil.brentPrice, 2) + '/bbl'} change={data.oil.brentChange} />
              </>
          }
        </div>
      </div>

      <div className="footer">Auto-refreshes every 3 minutes</div>
    </div>
  )
}
