import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, Sparkles, Trash2, X } from 'lucide-react'

const API_ROOT = 'http://localhost:8080/api'
const STARTER = {
  role: 'assistant',
  text: 'Hi! I can look up live StockWise inventory, transaction history, restocking priorities, warehouse shelves, monthly reports, and product demand. I only read data and cannot change stock.',
}
const SUGGESTIONS = [
  'How many products do we have?',
  'Which products are out of stock?',
  'Which shelves are full?',
  'Show the latest sales',
  'Which products have the highest demand?',
]
const qty = value => Number(value || 0).toLocaleString('en-IN')
const dateTime = value => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

export default function InventoryAssistant({ secureFetch }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([{ ...STARTER, id: 1 }])
  const scrollRef = useRef(null)
  const sequence = useRef(1)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, open])

  const getJson = async path => {
    const response = await secureFetch(`${API_ROOT}${path}`)
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body?.detail || body?.message || `Request failed (${response.status})`)
    return body
  }
  const getProducts = async () => {
    const body = await getJson('/products')
    if (!Array.isArray(body)) throw new Error('The product endpoint returned an unexpected response.')
    return body
  }
  const getPriority = async () => {
    const body = await getJson('/reorder/priority')
    if (!Array.isArray(body)) throw new Error('The restock-priority endpoint returned an unexpected response.')
    return body
  }
  const getTransactions = async type => {
    const params = new URLSearchParams({ page: '0', size: '20', sort: 'effectiveAt,desc' })
    params.append('sort', 'id,desc')
    if (type) params.set('type', type)
    const body = await getJson(`/inventory/transactions?${params}`)
    const rows = Array.isArray(body) ? body : body?.content
    if (!Array.isArray(rows)) throw new Error('The transaction endpoint returned an unexpected response.')
    return [...rows].sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())
  }
  const getMonthlyReport = async () => {
    const body = await getJson('/inventory/reports/monthly')
    if (!Array.isArray(body?.months)) throw new Error('The monthly report endpoint returned an unexpected response.')
    return body
  }
  const getWarehouse = async () => {
    const [racks, shelves] = await Promise.all([getJson('/warehouse/racks'), getJson('/warehouse/shelves')])
    if (!Array.isArray(racks) || !Array.isArray(shelves)) throw new Error('The warehouse endpoint returned an unexpected response.')
    const rackById = new Map(racks.map(rack => [String(rack.id), rack]))
    const detailed = await Promise.all(shelves.map(async shelf => {
      const allocations = await getJson(`/warehouse/shelves/${shelf.id}/inventory`)
      if (!Array.isArray(allocations)) throw new Error(`Shelf ${shelf.code} returned an unexpected inventory response.`)
      const used = allocations.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      return { ...shelf, rackName: rackById.get(String(shelf.rackId))?.name, used }
    }))
    return detailed
  }

  const answer = async input => {
    const text = input.trim()
    const normalized = text.toLowerCase()

    if (/(monthly|month|april|may|june|july|august|september|october|november).*(sales|performance|report)|(sales|performance).*(monthly|month)/.test(normalized)) {
      const report = await getMonthlyReport()
      const rows = report.months.map(month => {
        const sales = month.soldQuantity === null || month.soldQuantity === undefined ? 'sales unavailable' : `${qty(month.soldQuantity)} units sold`
        const status = month.status === 'NO_HISTORICAL_TRANSACTION_DATA' ? 'no imported historical transaction data' : `partial coverage from ${month.coverageStart || 'Nov 23, 2026'}`
        return `${month.monthName}: ${sales} (${status})`
      })
      return `Monthly sales performance (${report.year}, ${report.reportingTimezone}):\n${rows.join('\n')}\nMissing historical data is shown as unavailable, not zero.`
    }

    if (/(shelf|shelves|rack).*(full|capacity)|(full|capacity).*(shelf|shelves|rack)/.test(normalized)) {
      const shelves = await getWarehouse()
      if (!shelves.length) return 'No warehouse shelves are configured in the current database.'
      const measured = shelves.filter(shelf => Number.isFinite(Number(shelf.maxCapacity)) && Number(shelf.maxCapacity) > 0)
      const full = measured.filter(shelf => shelf.used >= Number(shelf.maxCapacity))
      if (full.length) return `Full shelves (${full.length}):\n${full.map(shelf => `• ${shelf.code} · ${shelf.rackCode || shelf.rackName || `Rack ${shelf.rackId}`} · ${qty(shelf.used)} / ${qty(shelf.maxCapacity)} units`).join('\n')}${measured.length < shelves.length ? '\nSome shelves have no usable capacity data and were omitted.' : ''}`
      if (measured.length !== shelves.length) return 'I could not determine whether all shelves are full because some capacity data is unavailable.'
      return 'No shelves are full based on the current shelf allocations and configured capacities.'
    }

    if (/(unallocated|not allocated|unassigned).*(stock|quantity|inventory)|(stock|quantity|inventory).*(unallocated|unassigned)/.test(normalized)) {
      const products = await getProducts()
      if (products.some(product => product.unallocatedQuantity === null || product.unallocatedQuantity === undefined || !Number.isFinite(Number(product.unallocatedQuantity)))) return 'Unallocated stock is unavailable because one or more products have no unallocated quantity in the API response.'
      const total = products.reduce((sum, product) => sum + Number(product.unallocatedQuantity), 0)
      const nonzero = products.filter(product => Number(product.unallocatedQuantity) > 0).sort((a, b) => Number(b.unallocatedQuantity) - Number(a.unallocatedQuantity))
      return `Unallocated stock: ${qty(total)} units across ${nonzero.length} products.${nonzero.length ? `\n${nonzero.slice(0, 8).map(product => `• ${product.name}: ${qty(product.unallocatedQuantity)}`).join('\n')}` : ''}\nThis quantity is not counted as physically placed on shelves.`
    }

    if (/(out of stock|zero stock|no stock|out-of-stock)/.test(normalized)) {
      const products = await getProducts()
      const out = products.filter(product => Number(product.quantity) <= 0)
      return out.length ? `Out-of-stock products (${out.length}):\n${out.map(product => `• ${product.name} (${product.sku})`).join('\n')}` : 'No products are currently at zero or negative stock.'
    }

    if (/(urgent|priority|priorit|restock|replenish|need.*stock)/.test(normalized)) {
      const products = await getPriority()
      return products.length ? `Restocking priorities, in the backend Min Heap order:\n${products.slice(0, 10).map((product, index) => `• ${index + 1}. ${product.name} (${product.sku}) — ${qty(product.quantity)} on hand, reorder level ${qty(product.reorderLevel)}${Number(product.dailyDemand) > 0 ? `, demand ${qty(product.dailyDemand)}/day` : ''}`).join('\n')}${products.length > 10 ? `\n…and ${products.length - 10} more.` : ''}` : 'The restock-priority endpoint currently returns no products.'
    }

    if (/(latest|recent).*(sale|sales|purchase|purchases)|(sale|sales|purchase|purchases).*(latest|recent)/.test(normalized)) {
      const type = /purchas/.test(normalized) ? 'PURCHASE' : 'SALE'
      const transactions = await getTransactions(type)
      const label = type === 'SALE' ? 'sales' : 'purchases'
      return transactions.length ? `Latest ${label}:\n${transactions.slice(0, 8).map(transaction => `• ${transaction.productName || `Product ${transaction.productId}`} — ${qty(transaction.quantity)} units · ${dateTime(transaction.effectiveAt)}`).join('\n')}` : `There are no recorded ${label} in the transaction ledger.`
    }

    if (/(highest|most|top).*(demand|requested|selling)|(demand|requested).*(highest|most|top)/.test(normalized)) {
      const products = await getProducts()
      const ranked = products.filter(product => Number.isFinite(Number(product.dailyDemand)) && Number(product.dailyDemand) > 0).sort((a, b) => Number(b.dailyDemand) - Number(a.dailyDemand))
      return ranked.length ? `Highest configured daily demand:\n${ranked.slice(0, 8).map((product, index) => `• ${index + 1}. ${product.name} (${product.sku}) — ${qty(product.dailyDemand)} units/day`).join('\n')}` : 'Daily demand is not configured with positive values for any product, so I cannot rank demand.'
    }

    const products = await getProducts()
    if (/(how many|number of|count|total).*(product|item)|(product|item).*(count|catalogue|catalog)/.test(normalized)) return `There are ${qty(products.length)} products in the current catalogue, with ${qty(products.reduce((sum, product) => sum + Number(product.quantity || 0), 0))} total units on hand.`

    const productMatch = products
      .map(product => {
        const name = String(product.name || '').toLowerCase()
        const sku = String(product.sku || '').toLowerCase()
        const exact = (name && normalized.includes(name)) || (sku && normalized.includes(sku))
        const tokens = name.split(/[^a-z0-9]+/).filter(token => token.length > 2)
        const score = tokens.filter(token => normalized.includes(token)).length
        return { product, exact, score }
      })
      .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score)[0]
    if (productMatch && (productMatch.exact || productMatch.score > 0) && /(quantity|stock|on hand|available|how many|have)/.test(normalized)) {
      const product = productMatch.product
      return `${product.name} (${product.sku}) currently has ${qty(product.quantity)} units in total stock.${product.unallocatedQuantity !== null && product.unallocatedQuantity !== undefined ? ` ${qty(product.unallocatedQuantity)} are unallocated.` : ''}`
    }
    if (/(quantity|stock|on hand|available)/.test(normalized)) return 'I could not match that product to the current catalogue. Try its exact product name or SKU.'
    return 'I can answer questions about product counts, a product’s current quantity, out-of-stock products, restock priorities, unallocated stock, full shelves, recent sales or purchases, monthly sales, and configured demand. I could not match this question to one of those data requests.'
  }

  const ask = async value => {
    const text = value.trim()
    if (!text || busy) return
    const userMessage = { id: ++sequence.current, role: 'user', text }
    setMessages(current => [...current, userMessage])
    setQuestion('')
    setBusy(true)
    try {
      const response = await answer(text)
      setMessages(current => [...current, { id: ++sequence.current, role: 'assistant', text: response }])
    } catch (error) {
      setMessages(current => [...current, { id: ++sequence.current, role: 'assistant', text: `I couldn't retrieve that StockWise data. ${error.message || 'The API request failed.'} Please try again when the backend is available.` }])
    } finally {
      setBusy(false)
    }
  }

  return <>
    {open && <section className="assistant-panel" aria-label="StockWise Inventory Assistant" aria-live="polite">
      <header className="assistant-header"><span className="assistant-brand-icon"><Bot size={19}/></span><div><strong>Inventory Assistant</strong><small><i/> Read-only · Live StockWise data</small></div><button type="button" disabled={busy} onClick={() => setMessages([{ ...STARTER, id: ++sequence.current }])} aria-label="Clear chat" title="Clear chat"><Trash2 size={15}/></button><button type="button" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={17}/></button></header>
      <div className="assistant-messages">
        {messages.map(message => <div className={`assistant-message ${message.role}`} key={message.id}><span className="assistant-message-avatar">{message.role === 'assistant' ? <Sparkles size={13}/> : 'You'}</span><div className="assistant-bubble">{message.text}</div></div>)}
        {busy && <div className="assistant-message assistant"><span className="assistant-message-avatar"><Sparkles size={13}/></span><div className="assistant-bubble assistant-typing"><i/><i/><i/><span>Checking StockWise data…</span></div></div>}
        <div ref={scrollRef}/>
      </div>
      {messages.length === 1 && <div className="assistant-suggestions"><small>TRY ASKING</small>{SUGGESTIONS.map(suggestion => <button key={suggestion} type="button" disabled={busy} onClick={() => ask(suggestion)}>{suggestion}</button>)}</div>}
      <form className="assistant-composer" onSubmit={event => { event.preventDefault(); ask(question) }}><input aria-label="Ask StockWise" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about your inventory…" disabled={busy}/><button type="submit" disabled={busy || !question.trim()} aria-label="Send question"><Send size={16}/></button></form>
      <div className="assistant-footnote">Answers are generated from current API records. No stock changes can be made here.</div>
    </section>}
    <button className={`assistant-launcher ${open ? 'is-open' : ''}`} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Close inventory assistant' : 'Open inventory assistant'} title="Ask the Inventory Assistant">{open ? <X size={21}/> : <MessageCircle size={21}/>}<span>{open ? 'Close' : 'Ask StockWise'}</span></button>
  </>
}
