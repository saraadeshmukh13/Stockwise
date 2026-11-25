import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, Package, Warehouse, RefreshCw, ChartNoAxesCombined,
  Activity, Search, Bell, Plus, ArrowUpRight, AlertTriangle, TrendingUp,
  Menu, X, MoreHorizontal, Download, Pencil, Trash2, Boxes, ChevronRight,
  PackageCheck, CircleDollarSign, SlidersHorizontal, ScanSearch,
  MapPin, Zap, CheckCircle2, Truck, Gauge, Layers3,
  ArrowDownToLine, ArrowUpFromLine, RotateCw, Eye, ListFilter,
  ShieldCheck, Database, Cpu, Wifi, Server, CalendarClock, LogOut
} from 'lucide-react'
import './App.css'
import Warehouse3D from './Warehouse3D'
import InventoryAssistant from './InventoryAssistant'

const API = 'http://localhost:8080/api/products'
const INVENTORY_API = 'http://localhost:8080/api/inventory'
const WAREHOUSE_API = 'http://localhost:8080/api/warehouse'
const navItems = [
  { name: 'Command Center', icon: LayoutDashboard },
  { name: 'Warehouse', icon: Warehouse },
  { name: 'Inventory', icon: Package },
  { name: 'Purchase Stock', icon: ArrowDownToLine },
  { name: 'Sell Stock', icon: ArrowUpFromLine },
  { name: 'Stock Intelligence', icon: Zap },
  { name: 'Monthly Stock Report', icon: CalendarClock },
  { name: 'Analytics', icon: ChartNoAxesCombined },
  { name: 'Warehouse Management', icon: Layers3, adminOnly: true },
  { name: 'Operations', icon: Activity, adminOnly: true },
]
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const preciseMoney = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 4 }).format(Number(value || 0))
const number = value => Number(value || 0).toLocaleString('en-IN')
const stockDateLabel = value => {
  if (!value) return 'Unavailable'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}
const shiftMonth = (value, delta) => {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function App() {
  const [products, setProducts] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerBusy, setRegisterBusy] = useState(false)
  const [registerMessage, setRegisterMessage] = useState('')
  const [activePage, setActivePage] = useState('Command Center')
  const [search, setSearch] = useState('')
  const [trieResults, setTrieResults] = useState([])
  const [trieLoading, setTrieLoading] = useState(false)
  const [trieError, setTrieError] = useState('')
  const trieRequestId = useRef(0)
  const [skuQuery, setSkuQuery] = useState('')
  const [skuProduct, setSkuProduct] = useState(null)
  const [skuLookupBusy, setSkuLookupBusy] = useState(false)
  const [skuLookupError, setSkuLookupError] = useState('')
  const [skuNotFound, setSkuNotFound] = useState(false)
  const [rangeStart, setRangeStart] = useState('0')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeResult, setRangeResult] = useState(null)
  const [rangeProducts, setRangeProducts] = useState([])
  const [rangeBusy, setRangeBusy] = useState(false)
  const [rangeError, setRangeError] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [productsError, setProductsError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  const [warehouseView, setWarehouseView] = useState('3d')
  const [selectedWarehouseRackId, setSelectedWarehouseRackId] = useState(null)
  const [selectedWarehouseShelfId, setSelectedWarehouseShelfId] = useState(null)
  const [inventoryTab, setInventoryTab] = useState('All items')
  const [stockPriority, setStockPriority] = useState([])
  const [stockPriorityLoading, setStockPriorityLoading] = useState(false)
  const [stockPriorityError, setStockPriorityError] = useState('')
  const [stockLedger, setStockLedger] = useState([])
  const [stockLedgerLoading, setStockLedgerLoading] = useState(false)
  const [stockLedgerError, setStockLedgerError] = useState('')
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [monthlyReportSelection, setMonthlyReportSelection] = useState('2026-11')
  const [monthlyReportLoading, setMonthlyReportLoading] = useState(false)
  const [monthlyReportError, setMonthlyReportError] = useState('')
  const monthlyReportRequestRef = useRef(0)
  const [operationTab, setOperationTab] = useState('Live board')
  const [shelves, setShelves] = useState([])
  const [warehouseRacks, setWarehouseRacks] = useState([])
  const [shelfInventoryById, setShelfInventoryById] = useState({})
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [warehouseError, setWarehouseError] = useState('')
  const [rackForm, setRackForm] = useState({ code: '', name: '', description: '' })
  const [shelfForm, setShelfForm] = useState({ code: '', rackId: '', maxCapacity: '' })
  const [allocationForm, setAllocationForm] = useState({ productId: '', shelfId: '', quantity: '' })
  const [warehouseManagementBusy, setWarehouseManagementBusy] = useState('')
  const [warehouseManagementError, setWarehouseManagementError] = useState('')
  const [warehouseManagementNotice, setWarehouseManagementNotice] = useState('')
  const [shelvesLoading, setShelvesLoading] = useState(false)
  const [shelvesError, setShelvesError] = useState('')
  const [purchaseProductId, setPurchaseProductId] = useState('')
  const [purchaseQuantity, setPurchaseQuantity] = useState('')
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState('')
  const [purchaseShelfId, setPurchaseShelfId] = useState('')
  const [purchaseReference, setPurchaseReference] = useState('')
  const [purchaseNotes, setPurchaseNotes] = useState('')
  const [purchaseBusy, setPurchaseBusy] = useState(false)
  const [purchaseRefreshBusy, setPurchaseRefreshBusy] = useState(false)
  const [purchaseReconciliationNeeded, setPurchaseReconciliationNeeded] = useState(false)
  const [purchaseNotice, setPurchaseNotice] = useState('')
  const [purchaseError, setPurchaseError] = useState('')
  const [saleShelves, setSaleShelves] = useState([])
  const saleAllocationRequest = useRef(0)
  const [saleShelvesLoading, setSaleShelvesLoading] = useState(false)
  const [saleShelvesError, setSaleShelvesError] = useState('')
  const [saleAllocations, setSaleAllocations] = useState({})
  const [saleAllocationsLoading, setSaleAllocationsLoading] = useState(false)
  const [saleAllocationsError, setSaleAllocationsError] = useState('')
  const [saleProductId, setSaleProductId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('')
  const [saleUnitPrice, setSaleUnitPrice] = useState('')
  const [saleShelfId, setSaleShelfId] = useState('')
  const [saleReference, setSaleReference] = useState('')
  const [saleNotes, setSaleNotes] = useState('')
  const [saleBusy, setSaleBusy] = useState(false)
  const [saleRefreshBusy, setSaleRefreshBusy] = useState(false)
  const [saleReconciliationNeeded, setSaleReconciliationNeeded] = useState(false)
  const [saleNotice, setSaleNotice] = useState('')
  const [saleError, setSaleError] = useState('')
  const [form, setForm] = useState({ name: '', sku: '', category: '', quantity: 0, reorderLevel: 10, price: 0, dailyDemand: 1, stockAddedDate: '' })

  const getCookie = name => document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=').slice(1).join('=') || ''
  const refreshCsrf = async () => {
    const response = await fetch('http://localhost:8080/api/auth/csrf', { credentials: 'include' })
    if (!response.ok) throw new Error('Could not initialise secure session')
    return (await response.json()).token
  }
  const secureFetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const headers = new Headers(options.headers || {})
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      let token = getCookie('XSRF-TOKEN')
      if (!token) token = await refreshCsrf()
      headers.set('X-XSRF-TOKEN', decodeURIComponent(token))
    }
    return fetch(url, { ...options, headers, credentials: 'include' })
  }
  const handleLogin = async e => {
    e.preventDefault(); setLoginBusy(true); setLoginError('')
    try {
      await refreshCsrf()
      const response = await secureFetch('http://localhost:8080/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:loginUsername.trim(), password:loginPassword}) })
      if (!response.ok) throw new Error((await response.json().catch(()=>({}))).message || 'Login failed')
      const user = await response.json(); setAuthUser(user); setLoginPassword(''); await refreshDashboardData()
    } catch (error) { setLoginError(error.message || 'Unable to sign in.'); } finally { setLoginBusy(false) }
  }
  const handleRegister = async e => {
    e.preventDefault()
    setRegisterMessage('')
    if (registerPassword.length < 12) {
      setRegisterMessage('Password must contain at least 12 characters.')
      return
    }
    if (registerPassword !== confirmPassword) {
      setRegisterMessage('Passwords do not match.')
      return
    }
    setRegisterBusy(true)
    try {
      await refreshCsrf()
      const response = await secureFetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: registerUsername.trim(), password: registerPassword })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || `Registration failed (${response.status})`)
      setLoginUsername(registerUsername.trim())
      setLoginPassword('')
      setRegisterUsername('')
      setRegisterPassword('')
      setConfirmPassword('')
      setAuthMode('login')
      setLoginError('')
      setRegisterMessage(data.message || 'Account created. Please sign in.')
    } catch (error) {
      setRegisterMessage(error.message || 'Unable to create account.')
    } finally {
      setRegisterBusy(false)
    }
  }

  const handleLogout = async () => {
    try { await secureFetch('http://localhost:8080/api/auth/logout', { method:'POST' }) } catch (error) { console.error(error) }
    setAuthUser(null); setProducts([]); setActivePage('Command Center'); await refreshCsrf().catch(()=>{})
  }
  const fetchProducts = async () => {
    setLoading(true)
    try {
      setApiError('')
      setProductsError('')
      const response = await secureFetch(API)
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('The product API returned an invalid inventory list.')
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProductsError(error.message || 'Could not load the product catalogue.')
      setApiError('Could not connect to the StockWise API. Check that your Spring Boot backend is running on port 8080.')
    } finally { setLoading(false) }
  }
  const fetchStockPriority = async () => {
    setStockPriorityLoading(true)
    setStockPriorityError('')
    try {
      const response = await secureFetch('http://localhost:8080/api/reorder/priority')
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || data?.message || `Priority request failed (${response.status})`)
      if (!Array.isArray(data)) throw new Error('The priority API returned an invalid product list.')
      setStockPriority(data)
    } catch (error) {
      setStockPriority([])
      setStockPriorityError(error.message || 'Could not load restocking priorities.')
    } finally {
      setStockPriorityLoading(false)
    }
  }
  const fetchStockLedger = async () => {
    setStockLedgerLoading(true)
    setStockLedgerError('')
    try {
      const transactions = []
      let page = 0
      let totalPages = 1
      do {
        const response = await secureFetch(`${INVENTORY_API}/transactions?page=${page}&size=500`)
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.detail || data?.message || `Transaction history request failed (${response.status})`)
        if (!Array.isArray(data?.content) || !Number.isFinite(Number(data.totalPages))) {
          throw new Error('The transaction history API returned an invalid page.')
        }
        transactions.push(...data.content)
        totalPages = Number(data.totalPages)
        page += 1
      } while (page < totalPages)
      setStockLedger(transactions)
    } catch (error) {
      setStockLedger([])
      setStockLedgerError(error.message || 'Could not load transaction history.')
    } finally {
      setStockLedgerLoading(false)
    }
  }
  const fetchMonthlyStockReport = async (selection = monthlyReportSelection) => {
    const requestId = ++monthlyReportRequestRef.current
    setMonthlyReportLoading(true)
    setMonthlyReportError('')
    setMonthlyReport(null)
    try {
      const [year, month] = selection.split('-')
      const response = await secureFetch(`${INVENTORY_API}/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || data?.message || `Monthly report request failed (${response.status})`)
      if (!Array.isArray(data?.months)) throw new Error('The monthly report API returned an invalid report.')
      if (requestId === monthlyReportRequestRef.current) setMonthlyReport(data)
    } catch (error) {
      if (requestId === monthlyReportRequestRef.current) {
        setMonthlyReport(null)
        setMonthlyReportError(error.message || 'Could not load the monthly stock report.')
      }
    } finally {
      if (requestId === monthlyReportRequestRef.current) setMonthlyReportLoading(false)
    }
  }
  const refreshStockIntelligence = () => {
    void fetchProducts()
    void fetchStockPriority()
    void fetchStockLedger()
  }
  const refreshWarehouse = () => {
    void fetchProducts()
    void fetchWarehouseData()
  }
  const refreshDashboardData = () => Promise.allSettled([
    fetchProducts(),
    fetchStockPriority(),
    fetchStockLedger(),
    fetchWarehouseData(),
  ])
  const fetchWarehouseData = async () => {
    setWarehouseLoading(true)
    setWarehouseError('')
    try {
      const [rackResponse, shelfResponse] = await Promise.all([
        secureFetch(`${WAREHOUSE_API}/racks`),
        secureFetch(`${WAREHOUSE_API}/shelves`),
      ])
      const [rackData, shelfData] = await Promise.all([
        rackResponse.json().catch(() => null),
        shelfResponse.json().catch(() => null),
      ])
      if (!rackResponse.ok) throw new Error(rackData?.detail || rackData?.message || `Rack request failed (${rackResponse.status})`)
      if (!shelfResponse.ok) throw new Error(shelfData?.detail || shelfData?.message || `Shelf request failed (${shelfResponse.status})`)
      if (!Array.isArray(rackData) || !Array.isArray(shelfData)) throw new Error('The warehouse API returned invalid rack or shelf data.')

      const inventoryByShelf = Object.fromEntries(shelfData.map(shelf => {
        const allocations = Array.isArray(shelf.allocations) ? shelf.allocations : []
        return [String(shelf.id), allocations]
      }))
      const actualShelves = shelfData.map(shelf => {
        const allocations = inventoryByShelf[String(shelf.id)] || []
        const currentQuantity = allocations.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0)
        return { ...shelf, allocations, reportedCurrentQuantity: Number(shelf.currentQuantity), currentQuantity }
      })

      setWarehouseRacks(rackData)
      setShelves(actualShelves)
      setShelfInventoryById(inventoryByShelf)
      setPurchaseShelfId(current => current && !actualShelves.some(shelf => String(shelf.id) === current) ? '' : current)
      setSelectedWarehouseRackId(current => current && rackData.some(rack => String(rack.id) === String(current)) ? current : rackData[0]?.id ?? null)
      setSelectedWarehouseShelfId(current => current && actualShelves.some(shelf => String(shelf.id) === String(current)) ? current : null)
      return { ok: true, racks: rackData, shelves: actualShelves, inventoryByShelf }
    } catch (error) {
      const message = error.message || 'Could not load warehouse inventory.'
      setWarehouseRacks([])
      setShelves([])
      setShelfInventoryById({})
      setSelectedWarehouseRackId(null)
      setSelectedWarehouseShelfId(null)
      setPurchaseShelfId('')
      setWarehouseError(message)
      return { ok: false, error: message, racks: [], shelves: [], inventoryByShelf: {} }
    } finally {
      setWarehouseLoading(false)
    }
  }
  const runWarehouseManagementPost = async (operation, path, payload, afterSuccess) => {
    setWarehouseManagementBusy(operation)
    setWarehouseManagementError('')
    setWarehouseManagementNotice('')
    try {
      const response = await secureFetch(`${WAREHOUSE_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || data?.message || `Warehouse request failed (${response.status})`)
      afterSuccess()
      setWarehouseManagementNotice(operation === 'rack' ? 'Rack created.' : operation === 'shelf' ? 'Shelf created.' : 'Stock allocated to the selected shelf.')
      const [productsResult, warehouseResult] = await Promise.allSettled([
        refreshProductsAfterPurchase(),
        fetchWarehouseData(),
      ])
      const refreshed = productsResult.status === 'fulfilled'
        && warehouseResult.status === 'fulfilled'
        && warehouseResult.value.ok
      if (!refreshed) setWarehouseManagementError('The operation succeeded, but product and warehouse data could not both be refreshed. Refresh the page data before continuing.')
    } catch (error) {
      setWarehouseManagementError(error.message || 'Warehouse operation failed. No inventory was changed by this request.')
    } finally {
      setWarehouseManagementBusy('')
    }
  }
  const submitRack = event => {
    event.preventDefault()
    const payload = { code: rackForm.code.trim(), name: rackForm.name.trim(), description: rackForm.description.trim() || null }
    if (!payload.code || !payload.name) {
      setWarehouseManagementError('Enter a rack code and rack name.')
      return
    }
    void runWarehouseManagementPost('rack', '/racks', payload, () => setRackForm({ code: '', name: '', description: '' }))
  }
  const submitShelf = event => {
    event.preventDefault()
    const capacity = Number(shelfForm.maxCapacity)
    if (!shelfForm.code.trim() || !shelfForm.rackId) {
      setWarehouseManagementError('Enter a shelf code and select a rack.')
      return
    }
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setWarehouseManagementError('Shelf maximum capacity must be a positive whole number.')
      return
    }
    void runWarehouseManagementPost('shelf', '/shelves', {
      code: shelfForm.code.trim(),
      rackId: Number(shelfForm.rackId),
      maxCapacity: capacity,
    }, () => setShelfForm(current => ({ ...current, code: '', maxCapacity: '' })))
  }
  const submitAllocation = event => {
    event.preventDefault()
    const product = products.find(item => String(item.id) === allocationForm.productId)
    const shelf = shelves.find(item => String(item.id) === allocationForm.shelfId)
    const quantity = Number(allocationForm.quantity)
    if (!product || !shelf) {
      setWarehouseManagementError('Select an existing product and shelf before allocating stock.')
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setWarehouseManagementError('Allocation quantity must be a positive whole number.')
      return
    }
    if (quantity > Number(product.unallocatedQuantity)) {
      setWarehouseManagementError(`Only ${number(product.unallocatedQuantity)} units of this product are unallocated.`)
      return
    }
    const remainingCapacity = Number(shelf.maxCapacity) - Number(shelf.currentQuantity)
    if (quantity > remainingCapacity) {
      setWarehouseManagementError(`This shelf has capacity for ${number(Math.max(0, remainingCapacity))} more units.`)
      return
    }
    void runWarehouseManagementPost('allocation', `/shelves/${shelf.id}/inventory`, {
      productId: Number(product.id),
      quantity,
    }, () => setAllocationForm(current => ({ ...current, quantity: '' })))
  }
  const fetchShelves = async () => {
    setShelvesLoading(true)
    setShelvesError('')
    const result = await fetchWarehouseData()
    if (!result.ok) setShelvesError(result.error)
    setShelvesLoading(false)
    return result.ok
  }
  const refreshProductsAfterPurchase = async () => {
    try {
      const response = await secureFetch(API)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || data?.message || `Inventory refresh failed (${response.status})`)
      if (!Array.isArray(data)) throw new Error('The product API returned an invalid inventory list.')
      setProducts(data)
      setProductsError('')
      setApiError('')
      return data
    } catch (error) {
      setProductsError(error.message || 'Could not refresh product inventory.')
      throw error
    }
  }
  const refreshPurchaseInventory = async () => {
    setPurchaseRefreshBusy(true)
    setPurchaseReconciliationNeeded(true)
    const [productResult, shelfResult] = await Promise.allSettled([
      refreshProductsAfterPurchase(),
      fetchShelves(),
    ])
    const refreshedProducts = productResult.status === 'fulfilled' ? productResult.value : null
    const shelvesRefreshed = shelfResult.status === 'fulfilled' && shelfResult.value === true
    const refreshed = Boolean(refreshedProducts) && shelvesRefreshed
    setPurchaseReconciliationNeeded(!refreshed)
    setPurchaseRefreshBusy(false)
    return { refreshed, products: refreshedProducts }
  }
  const fetchSaleShelves = async () => {
    setSaleShelvesLoading(true)
    setSaleShelvesError('')
    const result = await fetchWarehouseData()
    if (result.ok) {
      setSaleShelves(result.shelves)
      setSaleShelfId(current => current && !result.shelves.some(shelf => String(shelf.id) === current) ? '' : current)
      setSaleShelvesLoading(false)
      return result
    } else {
      saleAllocationRequest.current++
      setSaleShelves([])
      setSaleShelfId('')
      setSaleAllocations({})
      setSaleAllocationsLoading(false)
      setSaleShelvesError(result.error || 'Could not load warehouse shelves.')
      setSaleShelvesLoading(false)
      return result
    }
  }
  const fetchSaleAllocations = async (productId, shelfList = saleShelves, inventorySnapshot = shelfInventoryById) => {
    if (!productId) {
      saleAllocationRequest.current++
      setSaleAllocations({})
      setSaleAllocationsError('')
      setSaleAllocationsLoading(false)
      return true
    }
    const requestId = ++saleAllocationRequest.current
    setSaleAllocationsLoading(true)
    setSaleAllocationsError('')
    try {
      const hasSnapshot = shelfList.every(shelf => Object.prototype.hasOwnProperty.call(inventorySnapshot, String(shelf.id)))
      const entries = hasSnapshot
        ? shelfList.map(shelf => {
          const allocation = inventorySnapshot[String(shelf.id)].find(row => String(row.productId) === String(productId))
          return [String(shelf.id), Number(allocation?.quantity || 0)]
        })
        : await Promise.all(shelfList.map(async shelf => {
          const response = await secureFetch(`${WAREHOUSE_API}/shelves/${shelf.id}/inventory`)
          const data = await response.json().catch(() => null)
          if (!response.ok) throw new Error(data?.detail || data?.message || `Could not load inventory for shelf ${shelf.code} (${response.status})`)
          if (!Array.isArray(data)) throw new Error(`Shelf ${shelf.code} returned an invalid inventory list.`)
          const allocation = data.find(row => String(row.productId) === String(productId))
          return [String(shelf.id), Number(allocation?.quantity || 0)]
        }))
      if (requestId !== saleAllocationRequest.current) return false
      setSaleAllocations(Object.fromEntries(entries))
      return true
    } catch (error) {
      if (requestId !== saleAllocationRequest.current) return false
      setSaleAllocations({})
      setSaleShelfId('')
      setSaleAllocationsError(error.message || 'Could not load shelf allocations for this product.')
      return false
    } finally {
      if (requestId === saleAllocationRequest.current) setSaleAllocationsLoading(false)
    }
  }
  const refreshSaleInventory = async (productId = saleProductId) => {
    setSaleRefreshBusy(true)
    setSaleReconciliationNeeded(true)
    const productPromise = refreshProductsAfterPurchase()
    const shelfResult = await fetchSaleShelves()
    const [productResult, allocationsRefreshed] = await Promise.all([
      productPromise.then(value => ({ ok: true, products: value })).catch(() => ({ ok: false, products: null })),
      shelfResult.ok ? fetchSaleAllocations(productId, shelfResult.shelves, shelfResult.inventoryByShelf) : Promise.resolve(false),
    ])
    const refreshed = productResult.ok && shelfResult.ok && allocationsRefreshed
    setSaleReconciliationNeeded(!refreshed)
    setSaleRefreshBusy(false)
    return { refreshed, products: productResult.products }
  }
  useEffect(() => {
    (async () => {
      try { await refreshCsrf(); const response = await fetch('http://localhost:8080/api/auth/me', { credentials:'include' }); if (response.ok) { setAuthUser(await response.json()); await refreshDashboardData(); } }
      catch (error) { console.error('Session check failed:', error); }
      finally { setAuthChecking(false); }
    })()
  }, [])
  useEffect(() => {
    const prefix = search.trim()
    const requestId = ++trieRequestId.current
    if (activePage !== 'Inventory' || !prefix) {
      return undefined
    }
    const timer = window.setTimeout(async () => {
      setTrieLoading(true)
      setTrieError('')
      setTrieResults([])
      try {
        const response = await secureFetch(`${API}/search?prefix=${encodeURIComponent(prefix)}`)
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.detail || data?.message || `Product prefix search failed (${response.status})`)
        if (!Array.isArray(data)) throw new Error('The Trie search API returned an invalid product list.')
        if (requestId === trieRequestId.current) setTrieResults(data)
      } catch (error) {
        if (requestId === trieRequestId.current) {
          setTrieResults([])
          setTrieError(error.message || 'Product prefix search is unavailable.')
        }
      } finally {
        if (requestId === trieRequestId.current) setTrieLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [activePage, search])
  const lowStock = useMemo(() => products.filter(p => Number(p.quantity) <= Number(p.reorderLevel)), [products])
  const outOfStock = useMemo(() => products.filter(p => Number(p.quantity) <= 0), [products])
  const stockLedgerTotals = useMemo(() => stockLedger.reduce((totals, transaction) => {
    const productId = String(transaction.productId)
    if (!totals[productId]) totals[productId] = { purchased: 0, sold: 0 }
    if (transaction.type === 'PURCHASE') totals[productId].purchased += Number(transaction.quantity || 0)
    if (transaction.type === 'SALE') totals[productId].sold += Number(transaction.quantity || 0)
    return totals
  }, {}), [stockLedger])
  const actualPurchasedUnits = useMemo(() => stockLedger.reduce((sum, transaction) => sum + (transaction.type === 'PURCHASE' ? Number(transaction.quantity || 0) : 0), 0), [stockLedger])
  const actualSoldUnits = useMemo(() => stockLedger.reduce((sum, transaction) => sum + (transaction.type === 'SALE' ? Number(transaction.quantity || 0) : 0), 0), [stockLedger])
  const actualPurchasedValue = useMemo(() => {
    const rows = stockLedger.filter(transaction => transaction.type === 'PURCHASE')
    if (rows.some(transaction => transaction.unitPrice === null || transaction.unitPrice === undefined || !Number.isFinite(Number(transaction.unitPrice)))) return null
    return rows.reduce((sum, transaction) => sum + Number(transaction.quantity || 0) * Number(transaction.unitPrice), 0)
  }, [stockLedger])
  const actualSoldValue = useMemo(() => {
    const rows = stockLedger.filter(transaction => transaction.type === 'SALE')
    if (rows.some(transaction => transaction.unitPrice === null || transaction.unitPrice === undefined || !Number.isFinite(Number(transaction.unitPrice)))) return null
    return rows.reduce((sum, transaction) => sum + Number(transaction.quantity || 0) * Number(transaction.unitPrice), 0)
  }, [stockLedger])
  const totalUnits = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
  const stockValue = products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.price || 0), 0)
  const categories = [...new Set(products.map(p => p.category || 'Uncategorised'))]
  const inventorySearchProducts = search.trim() ? trieResults : products
  const filteredProducts = inventorySearchProducts.filter(p => {
    const matchesStock = !lowOnly || Number(p.quantity) <= Number(p.reorderLevel)
    const matchesCategory = categoryFilter === 'All categories' || (p.category || 'Uncategorised') === categoryFilter
    const status = Number(p.quantity) <= Number(p.reorderLevel) ? 'Low stock' : 'In stock'
    const matchesTab = inventoryTab === 'All items' || (inventoryTab === 'Low stock' ? status === 'Low stock' : status === 'In stock')
    return matchesStock && matchesCategory && matchesTab
  })
  const orderedProducts = useMemo(() => [...products].sort((a, b) => Number(a.id) - Number(b.id)), [products])
  const queue = [...lowStock].sort((a,b) => {
    const da = Number(a.dailyDemand || 0), db = Number(b.dailyDemand || 0)
    return (da > 0 ? Number(a.quantity)/da : Infinity) - (db > 0 ? Number(b.quantity)/db : Infinity)
  })
  const stockHealth = products.length ? Math.round((products.length - lowStock.length) / products.length * 100) : 0
  const dashboardLowStock = useMemo(() => products.filter(product => Number(product.quantity) > 0 && Number(product.quantity) <= Number(product.reorderLevel)), [products])
  const dashboardHealthy = products.filter(product => Number(product.quantity) > Number(product.reorderLevel)).length
  const dashboardStatusTotal = products.length
  const warehouseAllocations = Object.values(shelfInventoryById).flat()
  const dashboardAllocatedUnits = warehouseAllocations.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0)
  const dashboardCapacityKnown = shelves.length > 0 && shelves.every(shelf => Number.isFinite(Number(shelf.maxCapacity)) && Number(shelf.maxCapacity) > 0)
  const dashboardCapacity = dashboardCapacityKnown ? shelves.reduce((sum, shelf) => sum + Number(shelf.maxCapacity), 0) : null
  const dashboardUtilization = dashboardCapacity ? dashboardAllocatedUnits / dashboardCapacity * 100 : null
  const dashboardRecentActivity = useMemo(() => [...stockLedger].sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime()).slice(0, 6), [stockLedger])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', sku: '', category: '', quantity: 0, reorderLevel: 10, price: 0, dailyDemand: 1, stockAddedDate: '' })
    setShowForm(true)
  }
  const openEdit = p => {
    setEditing(p)
    setForm({ name:p.name||'', sku:p.sku||'', category:p.category||'', quantity:p.quantity??0, reorderLevel:p.reorderLevel??10, price:p.price??0, dailyDemand:p.dailyDemand??1, stockAddedDate:p.stockAddedDate ? String(p.stockAddedDate).slice(0,10) : '' })
    setShowForm(true)
  }
  const saveProduct = async e => {
    e.preventDefault()
    const payload = { ...form, stockAddedDate:form.stockAddedDate || null, name:form.name.trim(), sku:form.sku.trim(), category:form.category.trim(), quantity:Number(form.quantity), reorderLevel:Number(form.reorderLevel), price:Number(form.price), dailyDemand:Number(form.dailyDemand) }
    if (!payload.name || !payload.sku || !payload.category) return setNotice('Complete the product name, SKU and category.')
    if (!payload.stockAddedDate) return setNotice('Select the date when the initial stock was added.')
    if (['quantity','reorderLevel','price','dailyDemand'].some(k => !Number.isFinite(payload[k]) || payload[k] < 0)) return setNotice('Numeric values must be zero or greater.')
    try {
      const response = await secureFetch(editing ? `${API}/${editing.id}` : API, { method:editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      if (!response.ok) throw new Error(`Save failed (${response.status})`)
      setShowForm(false); setNotice(editing?'Product updated.':'Product added.'); await refreshDashboardData(); await fetchMonthlyStockReport()
    } catch (error) { console.error(error); setNotice('Could not save product. Check the backend and try again.') }
  }
  const deleteProduct = async p => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return
    try {
      const response = await secureFetch(`${API}/${p.id}`, { method:'DELETE' })
      if (!response.ok) throw new Error(`Delete failed (${response.status})`)
      setNotice(`${p.name} deleted.`); await fetchProducts()
    } catch (error) { console.error(error); setNotice('Could not delete this product.') }
  }
  const goTo = page => {
    setActivePage(page); setMenuOpen(false); setLowOnly(false); setCategoryFilter('All categories')
    if (page === 'Command Center') refreshDashboardData()
    if (page === 'Warehouse') refreshWarehouse()
    if (page === 'Warehouse Management') refreshWarehouse()
    if (page === 'Stock Intelligence') refreshStockIntelligence()
    if (page === 'Monthly Stock Report') fetchMonthlyStockReport()
    if (page === 'Purchase Stock') {
      setPurchaseNotice('')
      if (purchaseReconciliationNeeded) {
        setPurchaseError('Refreshing inventory and shelf availability before another purchase can be submitted.')
        refreshPurchaseInventory().then(result => {
          setPurchaseError(result.refreshed
            ? 'Inventory and shelf data were refreshed. Check transaction history before retrying the earlier request.'
            : 'Could not refresh both inventory and shelves. Another purchase remains blocked until refresh succeeds.')
        })
      } else {
        setPurchaseError('')
        fetchShelves()
      }
    }
    if (page === 'Sell Stock') {
      setSaleNotice('')
      if (saleReconciliationNeeded) {
        setSaleError('Refreshing product and shelf stock before another sale can be submitted.')
        refreshSaleInventory().then(result => {
          setSaleError(result.refreshed
            ? 'Product and shelf inventory were refreshed. Check transaction history before retrying the earlier request.'
            : 'Could not refresh product, shelf and allocation data. Another sale remains blocked until refresh succeeds.')
        })
      } else {
        setSaleError('')
        fetchSaleShelves().then(result => {
          if (result.ok && saleProductId) fetchSaleAllocations(saleProductId, result.shelves, result.inventoryByShelf)
        })
      }
    }
  }
  const submitPurchase = async event => {
    event.preventDefault()
    setPurchaseNotice('')
    setPurchaseError('')

    const product = products.find(item => String(item.id) === purchaseProductId)
    const shelf = shelves.find(item => String(item.id) === purchaseShelfId)
    const quantity = Number(purchaseQuantity)
    const unitPrice = Number(purchaseUnitPrice)
    const priceText = purchaseUnitPrice.trim()
    const validPricePrecision = /^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(priceText)

    if (purchaseReconciliationNeeded || purchaseRefreshBusy) return setPurchaseError('Refresh product and shelf data before recording another purchase.')
    if (!product) return setPurchaseError('Select a product before recording the purchase.')
    if (!Number.isInteger(quantity) || quantity <= 0) return setPurchaseError('Enter a whole-number purchase quantity greater than zero.')
    if (!priceText || !validPricePrecision || !Number.isFinite(unitPrice) || unitPrice < 0) return setPurchaseError('Enter a nonnegative unit price with no more than four decimal places.')
    if (!shelf) return setPurchaseError('Select a destination shelf before recording the purchase.')
    if (!purchaseReference.trim()) return setPurchaseError('Enter a supplier or purchase reference.')

    const remainingCapacity = Number(shelf.maxCapacity) - Number(shelf.currentQuantity)
    if (quantity > remainingCapacity) {
      return setPurchaseError(`This shelf has capacity for ${number(Math.max(0, remainingCapacity))} more units. Choose another shelf or reduce the quantity.`)
    }

    const payload = {
      productId: Number(product.id),
      quantity,
      unitPrice,
      destinationShelfId: Number(shelf.id),
      reference: purchaseReference.trim(),
      notes: purchaseNotes.trim() || null,
    }

    setPurchaseBusy(true)
    try {
      const response = await secureFetch(`${INVENTORY_API}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        const shelvesRefreshed = response.status === 409 ? await fetchShelves() : false
        const detail = responseData.detail || responseData.message || responseData.error
        if (response.status === 409 && /capacity/i.test(detail || '')) {
          throw new Error(shelvesRefreshed
            ? 'The purchase was rejected because shelf capacity changed or is insufficient. Shelf availability has been refreshed; review the destination and try again.'
            : 'The purchase was rejected because shelf capacity changed or is insufficient. Current shelf availability could not be loaded; retry the shelf refresh before submitting again.')
        }
        const requestError = new Error(detail || `Purchase request failed (${response.status}).`)
        requestError.purchaseOutcomeUncertain = response.status >= 500
        throw requestError
      }

      setPurchaseReconciliationNeeded(true)
      const inventoryRefresh = await refreshPurchaseInventory()
      if (!inventoryRefresh.refreshed) {
        setPurchaseNotice(`${number(quantity)} units were recorded for ${product.name}.`)
        setPurchaseError('The purchase succeeded, but product inventory and shelf availability could not both be refreshed. Another purchase is blocked until both refresh successfully.')
        return
      }

      const refreshedProduct = inventoryRefresh.products.find(item => String(item.id) === purchaseProductId)
      setPurchaseNotice(`${number(quantity)} units purchased for ${product.name}. Current stock: ${number(refreshedProduct?.quantity ?? Number(product.quantity) + quantity)} units.`)
      setPurchaseError('')
      setPurchaseQuantity('')
      setPurchaseReference('')
      setPurchaseNotes('')
    } catch (error) {
      if (error instanceof TypeError || error.purchaseOutcomeUncertain) {
        setPurchaseReconciliationNeeded(true)
        setPurchaseError('The purchase response was lost or the server returned an uncertain error. Refreshing product and shelf data before another attempt…')
        const inventoryRefresh = await refreshPurchaseInventory()
        setPurchaseError(inventoryRefresh.refreshed
          ? 'Product and shelf data were refreshed. Check transaction history before retrying, because the original purchase may have been recorded.'
          : 'The purchase outcome is uncertain and product/shelf refresh did not fully succeed. Another purchase is blocked; retry Refresh data before proceeding.')
      } else {
        setPurchaseError(error.message || 'Purchase failed. Inventory was not changed by this request.')
      }
    } finally {
      setPurchaseBusy(false)
    }
  }
  const submitSale = async event => {
    event.preventDefault()
    setSaleNotice('')
    setSaleError('')

    const product = products.find(item => String(item.id) === saleProductId)
    const shelf = saleShelves.find(item => String(item.id) === saleShelfId)
    const quantity = Number(saleQuantity)
    const unitPrice = Number(saleUnitPrice)
    const priceText = saleUnitPrice.trim()
    const validPricePrecision = /^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(priceText)

    if (saleReconciliationNeeded || saleRefreshBusy) return setSaleError('Refresh product and shelf stock before recording another sale.')
    if (productsError) return setSaleError('The product catalogue is unavailable. Refresh products before recording a sale.')
    if (!product) return setSaleError('Select a product before recording the sale.')
    if (!Number.isInteger(quantity) || quantity <= 0) return setSaleError('Enter a whole-number sale quantity greater than zero.')
    if (!priceText || !validPricePrecision || !Number.isFinite(unitPrice) || unitPrice < 0) return setSaleError('Enter a nonnegative unit selling price with no more than four decimal places.')
    if (saleShelvesError) return setSaleError('Shelf data is unavailable. Refresh warehouse shelves before recording a sale.')
    if (saleAllocationsLoading || saleAllocationsError) return setSaleError('Shelf inventory is unavailable. Refresh shelf allocations before recording a sale.')
    if (!shelf) return setSaleError('Select a source shelf containing this product.')
    if (!saleReference.trim()) return setSaleError('Enter a customer or order reference.')

    const shelfQuantity = Number(saleAllocations[String(shelf.id)] || 0)
    const availableStock = Math.min(Number(product.quantity), shelfQuantity)
    if (quantity > availableStock) {
      return setSaleError(`Only ${number(availableStock)} units are available for sale from ${shelf.code}. Choose another source shelf or reduce the quantity.`)
    }

    const payload = {
      productId: Number(product.id),
      quantity,
      unitPrice,
      sourceShelfId: Number(shelf.id),
      reference: saleReference.trim(),
      notes: saleNotes.trim() || null,
    }

    setSaleBusy(true)
    try {
      const response = await secureFetch(`${INVENTORY_API}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = responseData.detail || responseData.message || responseData.error
        if (response.status === 409) {
          const refreshed = await refreshSaleInventory(saleProductId)
          throw new Error(refreshed.refreshed
            ? `The sale was rejected: ${detail || 'available stock changed'}. Product and shelf availability have been refreshed; review the quantity and try again.`
            : `The sale was rejected: ${detail || 'available stock changed'}. Current inventory could not be fully refreshed; retry Refresh data before submitting again.`)
        }
        const requestError = new Error(detail || `Sale request failed (${response.status}).`)
        requestError.saleOutcomeUncertain = response.status >= 500
        throw requestError
      }

      setSaleReconciliationNeeded(true)
      const inventoryRefresh = await refreshSaleInventory(saleProductId)
      if (!inventoryRefresh.refreshed) {
        setSaleNotice(`${number(quantity)} units were recorded as sold for ${product.name}.`)
        setSaleError('The sale succeeded, but product, shelf and allocation data could not all be refreshed. Another sale is blocked until refresh succeeds.')
        return
      }

      const refreshedProduct = inventoryRefresh.products.find(item => String(item.id) === saleProductId)
      setSaleNotice(`${number(quantity)} units sold for ${product.name}. Current stock: ${number(refreshedProduct?.quantity ?? Number(product.quantity) - quantity)} units.`)
      setSaleError('')
      setSaleQuantity('')
      setSaleReference('')
      setSaleNotes('')
    } catch (error) {
      if (error instanceof TypeError || error.saleOutcomeUncertain) {
        setSaleReconciliationNeeded(true)
        setSaleError('The sale response was lost or the server returned an uncertain error. Refreshing product and shelf allocations before another attempt…')
        const inventoryRefresh = await refreshSaleInventory(saleProductId)
        setSaleError(inventoryRefresh.refreshed
          ? 'Product and shelf allocations were refreshed. Check transaction history before retrying, because the original sale may have been recorded.'
          : 'The sale outcome is uncertain and stock refresh did not fully succeed. Another sale is blocked; retry Refresh data before proceeding.')
      } else {
        setSaleError(error.message || 'Sale failed. Inventory was not changed by this request.')
      }
    } finally {
      setSaleBusy(false)
    }
  }
  const exportCsv = () => {
    const rows = [['Name','SKU','Category','Quantity','Reorder Level','Price','Daily Demand'], ...products.map(p=>[p.name,p.sku,p.category,p.quantity,p.reorderLevel,p.price,p.dailyDemand])]
    const csv = rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    const a = document.createElement('a'); a.href=url; a.download='stockwise-inventory.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const productStatus = p => Number(p.quantity) <= Number(p.reorderLevel) ? 'Critical' : Number(p.quantity) <= Number(p.reorderLevel)*1.5 ? 'Watch' : 'Healthy'

  const lookupSku = async event => {
    event?.preventDefault()
    const sku = skuQuery.trim()
    setSkuProduct(null)
    setSkuNotFound(false)
    setSkuLookupError('')
    if (!sku) {
      setSkuLookupError('Enter a SKU to look up.')
      return
    }
    setSkuLookupBusy(true)
    try {
      const response = await secureFetch(`${API}/sku/${encodeURIComponent(sku)}`)
      if (response.status === 404) {
        setSkuNotFound(true)
        return
      }
      const body = await response.text()
      if (!response.ok) {
        let detail = ''
        try { const parsed = JSON.parse(body); detail = parsed.detail || parsed.message || '' } catch { /* response may not be JSON */ }
        throw new Error(detail || `SKU lookup failed (${response.status})`)
      }
      const product = body ? JSON.parse(body) : null
      if (!product || typeof product !== 'object' || !product.sku) {
        setSkuNotFound(true)
        return
      }
      setSkuProduct(product)
    } catch (error) {
      setSkuLookupError(error.message || 'SKU lookup is unavailable.')
    } finally {
      setSkuLookupBusy(false)
    }
  }

  const runRangeSum = async event => {
    event.preventDefault()
    setRangeResult(null)
    setRangeProducts([])
    setRangeError('')
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (!rangeStart.trim() || !rangeEnd.trim() || !/^\d+$/.test(rangeStart) || !/^\d+$/.test(rangeEnd)
      || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
      setRangeError('Enter whole-number indexes with start at or before end.')
      return
    }
    if (productsError || loading) {
      setRangeError('Load the current product catalogue successfully before querying a range.')
      return
    }
    if (end >= orderedProducts.length) {
      setRangeError(`End index must be ${Math.max(0, orderedProducts.length - 1)} or lower for the current catalogue.`)
      return
    }
    setRangeBusy(true)
    try {
      const response = await secureFetch(`${INVENTORY_API}/range-sum?start=${start}&end=${end}`)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || data?.message || `Range query failed (${response.status})`)
      if (!data || Number(data.startIndex) !== start || Number(data.endIndex) !== end || !Number.isFinite(Number(data.totalStock))) {
        throw new Error('The range-sum API returned an invalid response.')
      }
      setRangeResult(data)
      setRangeProducts(orderedProducts.slice(start, end + 1))
    } catch (error) {
      setRangeError(error.message || 'Range-sum query is unavailable.')
    } finally {
      setRangeBusy(false)
    }
  }

  const productTable = (rows, compact=false) => <div className="table-scroll"><table className={`data-table ${compact?'compact-table':''}`}><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>STOCK ADDED DATE</th><th>ON HAND</th><th>REORDER POINT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
    {rows.map(p=><tr key={p.id}><td><div className="product-ident"><span className="product-icon"><Package size={16}/></span><span><b>{p.name}</b><small>{money(p.price)} / unit</small></span></div></td><td className="sku">{p.sku}</td><td>{p.category}</td><td>{stockDateLabel(p.stockAddedDate)}</td><td><b>{number(p.quantity)}</b><small className="unit-label">units</small></td><td>{number(p.reorderLevel)}</td><td><Status value={productStatus(p)}/></td><td><div className="actions-cell"><button className="tiny-icon" title="Edit" onClick={()=>openEdit(p)}><Pencil size={14}/></button><button className="tiny-icon delete" title="Delete" onClick={()=>deleteProduct(p)}><Trash2 size={14}/></button></div></td></tr>)}
    {rows.length===0&&<tr><td colSpan="8" className="empty-cell">{loading?'Loading inventory…':search.trim()&&trieLoading?'Searching product-name prefix…':search.trim()&&trieError?'Trie search unavailable.':search.trim()&&!trieResults.length?'No product names start with this prefix.':'No products match these filters.'}</td></tr>}
  </tbody></table></div>

  const renderCommand = () => {
    const productValue = value => loading && products.length === 0 ? '…' : productsError ? '—' : number(value)
    const ledgerAmount = value => stockLedgerLoading ? '…' : stockLedgerError ? '—' : value === null ? 'Unavailable' : preciseMoney(value)
    const dashboardStatusRows = [
      { label: 'Healthy', count: dashboardHealthy, className: 'healthy' },
      { label: 'Low stock', count: dashboardLowStock.length, className: 'low' },
      { label: 'Out of stock', count: outOfStock.length, className: 'out' },
    ]
    const dashboardShortcuts = [
      ['Purchase Stock', ArrowDownToLine], ['Sell Stock', ArrowUpFromLine],
      ['Stock Intelligence', Zap], ['Monthly Stock Report', CalendarClock], ['Warehouse', Warehouse],
    ]
    return <>
      <PageTitle eyebrow="WAREHOUSE INTELLIGENCE · OVERVIEW" title="Command Center" description="Live inventory, ledger activity, replenishment priorities and warehouse capacity." action={<div className="dashboard-title-actions"><button className="secondary-btn" onClick={refreshDashboardData}><RefreshCw size={14}/> Refresh data</button><button className="primary-btn" onClick={openAdd}><Plus size={16}/> Add product</button></div>}/>
      {productsError && <div className="error-banner"><AlertTriangle size={16}/><span>Product metrics are unavailable: {productsError}</span></div>}
      <div className="kpi-grid dashboard-kpis">
        <Kpi icon={Package} label="Total products" value={productValue(products.length)} detail="Live product catalogue" color="blue"/>
        <Kpi icon={Boxes} label="Units in stock" value={loading && products.length === 0 ? '…' : productsError ? '—' : number(totalUnits)} detail="Sum of current product quantities" color="teal"/>
        <Kpi icon={AlertTriangle} label="Low stock" value={productValue(dashboardLowStock.length)} detail="Positive stock at or below reorder level" color="amber"/>
        <Kpi icon={PackageCheck} label="Out of stock" value={productValue(outOfStock.length)} detail="Zero or negative current quantity" color="purple"/>
        <Kpi icon={ArrowUpFromLine} label="Total sales" value={ledgerAmount(actualSoldValue)} detail={stockLedgerLoading ? 'Loading transaction ledger' : stockLedgerError ? 'SALE ledger totals unavailable' : `${number(actualSoldUnits)} units in SALE transactions`} color="green"/>
        <Kpi icon={ArrowDownToLine} label="Total purchases" value={ledgerAmount(actualPurchasedValue)} detail={stockLedgerLoading ? 'Loading transaction ledger' : stockLedgerError ? 'PURCHASE ledger totals unavailable' : `${number(actualPurchasedUnits)} units in PURCHASE transactions`} color="blue"/>
        <Kpi icon={Gauge} label="Warehouse utilization" value={warehouseLoading ? '…' : warehouseError ? '—' : dashboardUtilization === null ? 'Unavailable' : `${dashboardUtilization.toFixed(1)}%`} detail={dashboardCapacity === null ? 'Create shelves to report capacity' : `${number(dashboardAllocatedUnits)} / ${number(dashboardCapacity)} allocated units`} color="teal"/>
      </div>
      {!loading&&!productsError&&products.length===0&&<section className="panel dashboard-empty-demo"><div><span className="panel-kicker">EMPTY DEMO CATALOGUE</span><h2>No products are stored in this demo database yet.</h2><p>Add your own product records to populate the dashboard. StockWise will not insert sample inventory automatically.</p></div><button className="primary-btn" onClick={openAdd}><Plus size={15}/> Add a product</button></section>}
      <section className="dashboard-shortcuts" aria-label="Dashboard shortcuts">
        {dashboardShortcuts.map(([label, Icon]) => <button key={label} onClick={() => goTo(label)}><Icon size={15}/><span>{label}</span><ChevronRight size={14}/></button>)}
      </section>
      <div className="dashboard-grid">
        <section className="panel dashboard-chart-panel">
          <PanelHead kicker="CURRENT CATALOGUE" title="Stock status" right={<button className="round-action" aria-label="Refresh dashboard data" onClick={refreshDashboardData}><RotateCw size={15}/></button>}/>
          {loading && products.length === 0 ? <Empty text="Loading product stock…"/> : productsError ? <div className="dashboard-state dashboard-state-error">Product stock status is unavailable.</div> : products.length === 0 ? <Empty text="The product catalogue is empty."/> : <div className="dashboard-status-chart">{dashboardStatusRows.map(row => <div className="dashboard-status-row" key={row.label}><div><span>{row.label}</span><b>{number(row.count)}</b></div><div className="dashboard-bar-track"><i className={row.className} style={{ width: `${dashboardStatusTotal ? row.count / dashboardStatusTotal * 100 : 0}%` }}/></div></div>)}</div>}
          {!productsError && products.length > 0 && <div className="dashboard-chart-foot">{number(dashboardStatusTotal)} products · status uses current quantity and reorder level</div>}
          <button className="panel-link" onClick={() => goTo('Inventory')}>Open inventory <ArrowUpRight size={14}/></button>
        </section>
        <section className="panel dashboard-chart-panel">
          <PanelHead kicker="LEDGER MOVEMENTS" title="Purchases and sales" right={<span className="soft-label">Recorded units</span>}/>
          {stockLedgerLoading && stockLedger.length === 0 ? <Empty text="Loading transaction ledger…"/> : stockLedgerError ? <div className="dashboard-state dashboard-state-error">Transaction totals are unavailable: {stockLedgerError}</div> : <div className="dashboard-movement-chart">
            {[{label:'Purchases', value:actualPurchasedUnits, className:'purchase'}, {label:'Sales', value:actualSoldUnits, className:'sale'}].map(item => {
              const max = Math.max(actualPurchasedUnits, actualSoldUnits, 1)
              return <div className="dashboard-movement-row" key={item.label}><div><span>{item.label}</span><b>{number(item.value)} units</b></div><div className="dashboard-bar-track"><i className={item.className} style={{ width: `${item.value / max * 100}%` }}/></div></div>
            })}
            {stockLedger.length === 0 && <div className="dashboard-chart-foot">No stock transactions are recorded. Opening stock and adjustments are excluded from these totals.</div>}
            {stockLedger.length > 0 && <div className="dashboard-chart-foot">Only PURCHASE and SALE ledger quantities are counted.</div>}
          </div>}
          <button className="panel-link" onClick={() => goTo('Stock Intelligence')}>View stock intelligence <ArrowUpRight size={14}/></button>
        </section>
        <section className="panel dashboard-priority-panel">
          <PanelHead kicker="MIN HEAP PRIORITY" title="Restocking priorities" right={<span className="count-chip">{stockPriorityLoading ? '…' : stockPriorityError ? '—' : stockPriority.length}</span>}/>
          {stockPriorityLoading && stockPriority.length === 0 ? <Empty text="Loading server-ranked priorities…"/> : stockPriorityError ? <div className="dashboard-state dashboard-state-error">Priorities unavailable: {stockPriorityError}</div> : stockPriority.length === 0 ? <Empty text="No products are currently returned by the priority queue."/> : <div className="dashboard-priority-list">{stockPriority.slice(0, 5).map((product, index) => <div className="dashboard-priority-row" key={product.id}><b className="dashboard-rank">{index + 1}</b><span><strong>{product.name}</strong><small>{product.sku} · {number(product.quantity)} on hand / reorder {number(product.reorderLevel)}</small></span><Status value={Number(product.quantity) <= 0 ? 'Critical' : 'Watch'}/></div>)}</div>}
          <button className="panel-link" onClick={() => goTo('Stock Intelligence')}>View all priorities <ArrowUpRight size={14}/></button>
        </section>
        <section className="panel dashboard-activity-panel">
          <PanelHead kicker="STOCK TRANSACTION LEDGER" title="Recent activity" right={<button className="round-action" aria-label="Refresh transactions" onClick={fetchStockLedger}><RotateCw size={15}/></button>}/>
          {stockLedgerLoading && stockLedger.length === 0 ? <Empty text="Loading recent activity…"/> : stockLedgerError ? <div className="dashboard-state dashboard-state-error">Recent activity unavailable: {stockLedgerError}</div> : dashboardRecentActivity.length === 0 ? <Empty text="No inventory transactions are recorded."/> : <div className="dashboard-activity-list">{dashboardRecentActivity.map(transaction => <div className="dashboard-activity-row" key={transaction.id}><span className={`dashboard-activity-icon ${String(transaction.type || '').toLowerCase()}`}><Activity size={14}/></span><span className="dashboard-activity-copy"><strong>{transaction.type?.replaceAll('_', ' ') || 'Transaction'} · {transaction.productName || `Product ${transaction.productId}`}</strong><small>{new Date(transaction.effectiveAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</small></span><b>{number(transaction.quantity)} units</b></div>)}</div>}
        </section>
      </div>
    </>
  }

const renderWarehouse = () => {
  const allocations = Object.values(shelfInventoryById).flat()
  const allocatedByProduct = allocations.reduce((totals, allocation) => {
    const key = String(allocation.productId)
    totals[key] = (totals[key] || 0) + Number(allocation.quantity || 0)
    return totals
  }, {})
  const totalAllocated = allocations.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0)
  const hasUnallocatedData = products.every(product => product.unallocatedQuantity !== null && product.unallocatedQuantity !== undefined && Number.isFinite(Number(product.unallocatedQuantity)))
  const totalUnallocated = hasUnallocatedData ? products.reduce((sum, product) => sum + Number(product.unallocatedQuantity), 0) : null
  const hasCapacityData = shelves.length > 0 && shelves.every(shelf => Number.isFinite(Number(shelf.maxCapacity)) && Number(shelf.maxCapacity) > 0)
  const totalCapacity = hasCapacityData ? shelves.reduce((sum, shelf) => sum + Number(shelf.maxCapacity), 0) : null
  const utilization = totalCapacity ? totalAllocated / totalCapacity * 100 : null
  const productIds = new Set(products.map(product => String(product.id)))
  const productsBalanced = hasUnallocatedData && products.every(product =>
    (allocatedByProduct[String(product.id)] || 0) + Number(product.unallocatedQuantity) === Number(product.quantity))
  const noUnknownAllocations = allocations.every(allocation => productIds.has(String(allocation.productId)))
  const shelfUsageBalanced = shelves.every(shelf => Number(shelf.reportedCurrentQuantity) === Number(shelf.currentQuantity))
  const inventoryBalanced = !warehouseError && !productsError && productsBalanced && noUnknownAllocations && shelfUsageBalanced
  const balanceAvailable = !warehouseError && !productsError && !loading && hasUnallocatedData
  const selectedRack = warehouseRacks.find(rack => String(rack.id) === String(selectedWarehouseRackId))
  const selectedRackShelves = shelves.filter(shelf => String(shelf.rackId) === String(selectedWarehouseRackId)).sort((a, b) => String(a.code).localeCompare(String(b.code)))
  const selectedShelf = shelves.find(shelf => String(shelf.id) === String(selectedWarehouseShelfId))
  const selectedShelfAllocations = selectedShelf ? shelfInventoryById[String(selectedShelf.id)] || [] : []
  const rackProductTotals = selectedRackShelves.flatMap(shelf => shelfInventoryById[String(shelf.id)] || []).reduce((totals, allocation) => {
    const key = String(allocation.productId)
    if (!totals[key]) totals[key] = { ...allocation, quantity: 0 }
    totals[key].quantity += Number(allocation.quantity || 0)
    return totals
  }, {})
  const capacityStatus = shelf => {
    if (Number(shelf.currentQuantity) <= 0) return 'Empty'
    if (Number(shelf.maxCapacity) > 0 && Number(shelf.currentQuantity) >= Number(shelf.maxCapacity)) return 'Full'
    return 'Partially occupied'
  }
  const selectRack = rackId => { setSelectedWarehouseRackId(rackId); setSelectedWarehouseShelfId(null) }
  const selectShelf = (rackId, shelfId) => { setSelectedWarehouseRackId(rackId); setSelectedWarehouseShelfId(shelfId) }

  return <>
    <PageTitle eyebrow="FACILITY VISUALISATION · LIVE DATABASE" title="Warehouse" description="Explore database-backed racks, shelf capacity and product allocations." action={<button className="secondary-btn" onClick={refreshWarehouse} disabled={warehouseLoading||loading}><RefreshCw size={14}/> Refresh warehouse</button>}/>
    <div className="warehouse-kpis">
      <Kpi icon={Warehouse} label="Racks" value={warehouseError?'—':warehouseLoading&&warehouseRacks.length===0?'…':number(warehouseRacks.length)} detail="Configured database racks" color="blue"/>
      <Kpi icon={Layers3} label="Shelves" value={warehouseError?'—':warehouseLoading&&shelves.length===0?'…':number(shelves.length)} detail="Across configured racks" color="purple"/>
      <Kpi icon={Boxes} label="Allocated stock" value={warehouseError?'—':warehouseLoading&&allocations.length===0?'…':number(totalAllocated)} detail="Sum of shelf inventory rows" color="teal"/>
      <Kpi icon={Package} label="Unallocated stock" value={productsError?'—':loading&&products.length===0?'…':hasUnallocatedData?number(totalUnallocated):'Unavailable'} detail="Stored separately from shelf stock" color="amber"/>
      <Kpi icon={Gauge} label="Shelf utilization" value={utilization===null?'Unavailable':`${utilization.toFixed(1)}%`} detail={totalCapacity===null?'Capacity data unavailable':`${number(totalAllocated)} / ${number(totalCapacity)} units`} color="green"/>
      <Kpi icon={CheckCircle2} label="Allocation check" value={!balanceAvailable?'Unavailable':inventoryBalanced?'Balanced':'Review'} detail="Product = shelf allocations + unallocated" color={inventoryBalanced?'green':'amber'}/>
    </div>
    {productsError&&<div className="error-banner"><AlertTriangle size={16}/><span>Product quantities and unallocated stock could not be refreshed: {productsError}</span><button onClick={fetchProducts}>Retry products</button></div>}
    {warehouseError&&<div className="error-banner"><AlertTriangle size={16}/><span>Warehouse data could not be loaded: {warehouseError}</span><button onClick={refreshWarehouse}>Retry</button></div>}
    {warehouseLoading&&warehouseRacks.length===0&&!warehouseError ? <section className="panel warehouse-empty"><Empty text="Loading racks, shelves and shelf allocations…"/></section> : !warehouseLoading&&!warehouseError&&warehouseRacks.length===0 ? <section className="panel warehouse-empty"><Empty text="No warehouse racks are configured yet."/></section> : warehouseRacks.length>0&&<>
      <Warehouse3D racks={warehouseRacks} shelves={shelves} inventoryByShelf={shelfInventoryById}
        selectedRackId={selectedWarehouseRackId} selectedShelfId={selectedWarehouseShelfId}
        onSelectRack={selectRack} onSelectShelf={selectShelf} loading={warehouseLoading} products={products}/>
      <div className="warehouse-detail-grid">
        <section className="panel warehouse-detail-panel">
          <PanelHead kicker="RACK INVENTORY" title={selectedRack?`${selectedRack.code} · ${selectedRack.name}`:'Select a rack'} right={<span className="count-chip">{selectedRackShelves.length} shelves</span>}/>
          {selectedRack?.description&&<p className="panel-description">{selectedRack.description}</p>}
          {selectedRackShelves.length===0?<Empty text="This rack has no shelves configured."/>:<div className="warehouse-shelf-list">{selectedRackShelves.map(shelf=><button type="button" key={shelf.id} className={`warehouse-shelf-card ${String(selectedWarehouseShelfId)===String(shelf.id)?'selected':''}`} onClick={()=>selectShelf(selectedRack.id,shelf.id)}>
            <span className="warehouse-shelf-mark"><Layers3 size={15}/></span><span className="warehouse-shelf-copy"><b>{shelf.code}</b><small>{number(shelf.currentQuantity)} / {number(shelf.maxCapacity)} units · {capacityStatus(shelf)}</small></span><ChevronRight size={14}/>
          </button>)}</div>}
          <div className="warehouse-allocation-list"><span className="panel-kicker">PRODUCTS ON THIS RACK</span>
            {Object.values(rackProductTotals).length===0?<Empty text="No products are allocated to this rack."/>:Object.values(rackProductTotals).sort((a,b)=>String(a.productName).localeCompare(String(b.productName))).map(product=><div className="warehouse-allocation-row" key={product.productId}><span><b>{product.productName}</b><small>{product.sku}</small></span><strong>{number(product.quantity)} units</strong></div>)}
          </div>
        </section>
        <section className="panel warehouse-detail-panel">
          <PanelHead kicker="SHELF CONTENTS" title={selectedShelf?selectedShelf.code:'Select a shelf'} right={selectedShelf&&<Status value={capacityStatus(selectedShelf)}/>}/>
          {selectedShelf?<><div className="warehouse-capacity-line"><span>Allocated capacity</span><b>{number(selectedShelf.currentQuantity)} / {number(selectedShelf.maxCapacity)} units</b></div>
            {selectedShelfAllocations.length===0?<Empty text="This shelf is empty. No product has been assigned here."/>:<div className="warehouse-allocation-list">{selectedShelfAllocations.map(product=><div className="warehouse-allocation-row" key={product.productId}><span><b>{product.productName}</b><small>{product.sku}</small></span><strong>{number(product.quantity)} units</strong></div>)}</div>}
            <div className="warehouse-unallocated-note"><Package size={15}/><span>Unallocated stock is tracked on the product record and is not shown as shelf contents.</span></div>
          </>:<Empty text="Select a shelf in the 3D warehouse or rack list to view its products and quantities."/>}
        </section>
      </div>
      <section className="panel warehouse-unallocated-panel">
        <PanelHead kicker="NOT ASSIGNED TO A SHELF" title="Unallocated stock" right={<span className="soft-label">{productsError?'Unavailable':`${number(totalUnallocated ?? 0)} units`}</span>}/>
        {productsError?<Empty text="Unallocated stock cannot be verified until the product API is available."/>:products.filter(product=>Number(product.unallocatedQuantity)>0).length===0?<Empty text="No unallocated stock is recorded for the current products."/>:<div className="warehouse-unallocated-list">{products.filter(product=>Number(product.unallocatedQuantity)>0).map(product=><div className="warehouse-allocation-row" key={product.id}><span><b>{product.name}</b><small>{product.sku} · {number(product.quantity)} total units</small></span><strong>{number(product.unallocatedQuantity)} units unallocated</strong></div>)}</div>}
      </section>
    </>}
  </>
}

const renderWarehouseManagement = () => {
  const selectedProduct = products.find(product => String(product.id) === allocationForm.productId)
  const selectedShelf = shelves.find(shelf => String(shelf.id) === allocationForm.shelfId)
  const quantity = Number(allocationForm.quantity)
  const productAllocated = selectedProduct
    ? Object.values(shelfInventoryById).flat().filter(row => String(row.productId) === String(selectedProduct.id)).reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    : 0
  const shelfRemainingCapacity = selectedShelf ? Math.max(0, Number(selectedShelf.maxCapacity) - Number(selectedShelf.currentQuantity)) : null
  const quantityValid = Number.isInteger(quantity) && quantity > 0
  const allocationInvalid = Boolean(selectedProduct && quantityValid && quantity > Number(selectedProduct.unallocatedQuantity))
    || Boolean(selectedShelf && quantityValid && quantity > shelfRemainingCapacity)
  const managementShelfStatus = shelf => Number(shelf.currentQuantity) <= 0 ? 'Empty'
    : Number(shelf.maxCapacity) > 0 && Number(shelf.currentQuantity) >= Number(shelf.maxCapacity) ? 'Full' : 'Partially occupied'

  return <>
    <PageTitle eyebrow="ADMINISTRATION · WAREHOUSE SETUP" title="Warehouse Management" description="Configure warehouse locations and assign existing unallocated stock to shelves." action={<button className="secondary-btn" onClick={refreshWarehouse} disabled={warehouseLoading||loading}><RefreshCw size={14}/> Refresh data</button>}/>
    <div className="warehouse-management-summary">
      <Kpi icon={Warehouse} label="Racks" value={warehouseError?'—':warehouseLoading&&warehouseRacks.length===0?'…':number(warehouseRacks.length)} detail="Existing warehouse racks" color="blue"/>
      <Kpi icon={Layers3} label="Shelves" value={warehouseError?'—':warehouseLoading&&shelves.length===0?'…':number(shelves.length)} detail="Existing capacity locations" color="purple"/>
      <Kpi icon={Package} label="Unallocated units" value={productsError?'—':loading&&products.length===0?'…':number(products.reduce((sum, product) => sum + Number(product.unallocatedQuantity || 0), 0))} detail="Existing stock not placed on shelves" color="amber"/>
    </div>
    {authUser?.role !== 'ADMIN' && <div className="error-banner"><ShieldCheck size={16}/> Admin permission is required to manage warehouse structure or allocations.</div>}
    {warehouseManagementNotice&&<div className="warehouse-management-feedback success" role="status"><CheckCircle2 size={16}/>{warehouseManagementNotice}</div>}
    {warehouseManagementError&&<div className="warehouse-management-feedback failure" role="alert"><AlertTriangle size={16}/>{warehouseManagementError}<button type="button" onClick={() => setWarehouseManagementError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
    {productsError&&<div className="error-banner"><AlertTriangle size={16}/><span>Product quantities are unavailable: {productsError}</span><button onClick={fetchProducts}>Retry products</button></div>}
    {warehouseError&&<div className="error-banner"><AlertTriangle size={16}/><span>Rack, shelf or allocation data is unavailable: {warehouseError}</span><button onClick={refreshWarehouse}>Retry warehouse</button></div>}
    <div className="warehouse-management-grid">
      <section className="panel warehouse-management-panel">
        <PanelHead kicker="LOCATION STRUCTURE · LEVEL 1" title="Create a rack" right={<span className="purchase-secure"><ShieldCheck size={14}/> Admin only</span>}/>
        <form className="warehouse-management-form" onSubmit={submitRack}>
          <label className="purchase-field">Rack code
            <input value={rackForm.code} maxLength="40" onChange={event => setRackForm(current => ({ ...current, code: event.target.value }))} placeholder="e.g. RACK-A" disabled={Boolean(warehouseManagementBusy)} required/>
          </label>
          <label className="purchase-field">Rack name
            <input value={rackForm.name} maxLength="120" onChange={event => setRackForm(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Electronics" disabled={Boolean(warehouseManagementBusy)} required/>
          </label>
          <label className="purchase-field warehouse-management-wide">Description <span className="optional-label">Optional</span>
            <textarea value={rackForm.description} maxLength="500" rows="2" onChange={event => setRackForm(current => ({ ...current, description: event.target.value }))} placeholder="Location or handling notes" disabled={Boolean(warehouseManagementBusy)}/>
          </label>
          <button className="primary-btn warehouse-management-submit" type="submit" disabled={Boolean(warehouseManagementBusy)||authUser?.role!=='ADMIN'}><Plus size={14}/>{warehouseManagementBusy==='rack'?'Creating rack…':'Create rack'}</button>
        </form>
      </section>
      <section className="panel warehouse-management-panel">
        <PanelHead kicker="LOCATION STRUCTURE · LEVEL 2" title="Create a shelf" right={<span className="count-chip">{number(warehouseRacks.length)} racks</span>}/>
        {warehouseRacks.length===0 ? <Empty text={warehouseLoading?'Loading racks…':'Create a rack before adding shelves.'}/> : <form className="warehouse-management-form" onSubmit={submitShelf}>
          <label className="purchase-field">Shelf code
            <input value={shelfForm.code} maxLength="60" onChange={event => setShelfForm(current => ({ ...current, code: event.target.value }))} placeholder="e.g. A-01-01" disabled={Boolean(warehouseManagementBusy)} required/>
          </label>
          <label className="purchase-field">Parent rack
            <select value={shelfForm.rackId} onChange={event => setShelfForm(current => ({ ...current, rackId: event.target.value }))} disabled={Boolean(warehouseManagementBusy)} required>
              <option value="">Choose a rack</option>{warehouseRacks.map(rack => <option key={rack.id} value={rack.id}>{rack.code} · {rack.name}</option>)}
            </select>
          </label>
          <label className="purchase-field">Maximum capacity (units)
            <input type="number" min="1" step="1" value={shelfForm.maxCapacity} onChange={event => setShelfForm(current => ({ ...current, maxCapacity: event.target.value }))} placeholder="Positive whole number" disabled={Boolean(warehouseManagementBusy)} required/>
          </label>
          <button className="primary-btn warehouse-management-submit" type="submit" disabled={Boolean(warehouseManagementBusy)||authUser?.role!=='ADMIN'}><Plus size={14}/>{warehouseManagementBusy==='shelf'?'Creating shelf…':'Create shelf'}</button>
        </form>}
      </section>
      <section className="panel warehouse-management-panel warehouse-allocation-management">
        <PanelHead kicker="EXISTING INVENTORY · NO NEW STOCK CREATED" title="Allocate unallocated stock" right={<span className="purchase-secure"><ShieldCheck size={14}/> Admin only</span>}/>
        <p className="panel-description">Allocation transfers existing quantity from a product’s unallocated balance to a shelf. It does not create inventory or record a purchase.</p>
        {productsError||warehouseError ? <Empty text="Refresh product and shelf data before allocating stock."/> : products.length===0 ? <Empty text={loading?'Loading products…':'No products are available to allocate.'}/> : shelves.length===0 ? <Empty text={warehouseLoading?'Loading shelves…':'Create a shelf before allocating stock.'}/> : <form className="warehouse-management-form allocation-form" onSubmit={submitAllocation}>
          <label className="purchase-field">Product with unallocated stock
            <select value={allocationForm.productId} onChange={event => setAllocationForm(current => ({ ...current, productId: event.target.value }))} disabled={Boolean(warehouseManagementBusy)||loading} required>
              <option value="">Choose a product</option>{products.filter(product => Number(product.unallocatedQuantity)>0).map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku} · {number(product.unallocatedQuantity)} unallocated</option>)}
            </select>
          </label>
          <label className="purchase-field">Destination shelf
            <select value={allocationForm.shelfId} onChange={event => setAllocationForm(current => ({ ...current, shelfId: event.target.value }))} disabled={Boolean(warehouseManagementBusy)||warehouseLoading} required>
              <option value="">Choose a shelf</option>{shelves.map(shelf => <option key={shelf.id} value={shelf.id}>{shelf.rackCode} · {shelf.code} · {number(Math.max(0, Number(shelf.maxCapacity)-Number(shelf.currentQuantity)))} capacity left</option>)}
            </select>
          </label>
          <label className="purchase-field">Quantity to allocate
            <input type="number" min="1" step="1" value={allocationForm.quantity} onChange={event => setAllocationForm(current => ({ ...current, quantity: event.target.value }))} placeholder="Positive whole number" disabled={!selectedProduct||!selectedShelf||Boolean(warehouseManagementBusy)} required/>
          </label>
          {selectedProduct&&<div className="allocation-preview">
            <div><small>PRODUCT TOTAL</small><b>{number(selectedProduct.quantity)} units</b></div>
            <div><small>ALREADY ALLOCATED</small><b>{warehouseError?'Unavailable':number(productAllocated)} units</b></div>
            <div><small>AVAILABLE UNALLOCATED</small><b>{number(selectedProduct.unallocatedQuantity)} units</b></div>
            {selectedShelf&&<div><small>SHELF CAPACITY LEFT</small><b>{number(shelfRemainingCapacity)} units</b></div>}
          </div>}
          {allocationInvalid&&<div className="purchase-capacity-warning"><AlertTriangle size={15}/><span>Allocation exceeds available product stock or shelf capacity.</span></div>}
          <button className="primary-btn warehouse-management-submit" type="submit" disabled={Boolean(warehouseManagementBusy)||authUser?.role!=='ADMIN'||!selectedProduct||!selectedShelf||!quantityValid||allocationInvalid}><Layers3 size={14}/>{warehouseManagementBusy==='allocation'?'Allocating stock…':'Allocate existing stock'}</button>
        </form>}
        <div className="warehouse-management-invariant"><CheckCircle2 size={15}/><span>Backend rechecks product quantity, unallocated stock, shelf capacity, locks and the inventory invariant atomically.</span></div>
      </section>
    </div>
    <section className="panel warehouse-management-existing">
      <PanelHead kicker="CURRENT CONFIGURATION" title="Racks and shelves" right={<button className="round-action" onClick={refreshWarehouse} aria-label="Refresh rack and shelf list"><RotateCw size={15}/></button>}/>
      {warehouseLoading&&warehouseRacks.length===0?<Empty text="Loading warehouse structure…"/>:warehouseError?<Empty text="Warehouse structure unavailable until refreshed."/>:warehouseRacks.length===0?<Empty text="No racks have been configured."/>:<div className="warehouse-management-rack-list">{warehouseRacks.map(rack=>{
        const rackShelves=shelves.filter(shelf=>String(shelf.rackId)===String(rack.id))
        return <div className="warehouse-management-rack" key={rack.id}><div className="warehouse-management-rack-head"><span className="warehouse-shelf-mark"><Warehouse size={15}/></span><span><b>{rack.code} · {rack.name}</b><small>{rack.description||'No description'} · {rackShelves.length} shelves</small></span></div>{rackShelves.length===0?<small className="warehouse-management-empty-shelves">No shelves configured under this rack.</small>:<div className="warehouse-management-shelves">{rackShelves.map(shelf=>{
          const allocations = Array.isArray(shelf.allocations) && shelf.allocations.length > 0 ? shelf.allocations : (shelfInventoryById[String(shelf.id)] || [])
          return <div className="warehouse-management-shelf" key={shelf.id}>
            <div className="warehouse-management-shelf-head">
              <span><b>{shelf.code}</b><small>{number(shelf.currentQuantity)} / {number(shelf.maxCapacity)} units</small></span>
              <Status value={managementShelfStatus(shelf)}/>
            </div>
            <div className="warehouse-management-shelf-products">
              {allocations.length===0
                ? <div className="warehouse-management-shelf-empty"><Package size={12}/><span>No products allocated</span></div>
                : allocations.map(item => <div className="warehouse-management-shelf-product" key={`${item.productId}-${item.shelfId || shelf.id}`}>
                    <span className="warehouse-management-shelf-product-icon"><Package size={12}/></span>
                    <span className="warehouse-management-shelf-product-main">
                      <b>{item.productName}</b>
                      <small>{item.sku}{item.category ? ` · ${item.category}` : ''}</small>
                    </span>
                    <span className="warehouse-management-shelf-product-qty">{number(item.quantity)} <small>units</small></span>
                  </div>)}
            </div>
          </div>
        })}</div>}</div>
      })}</div>}
    </section>
  </>
}


  const renderInventory = () => <>
    <PageTitle eyebrow="03 — INVENTORY EXPLORER" title="Inventory Explorer" description="A detailed catalogue view for every stock item, SKU and category." action={<button className="primary-btn" onClick={openAdd}><Plus size={16}/> Add item</button>}/>
    <div className="inventory-summary"><div className="summary-card"><span>ITEMS IN STOCK</span><b>{number(totalUnits)}</b><small>Units across catalogue</small></div><div className="summary-card alert-summary"><span>LOW STOCK ALERTS</span><b>{lowStock.length}</b><small>Products at reorder point</small></div><div className="summary-card"><span>CATALOGUE VALUE</span><b>{money(stockValue)}</b><small>Current stock valuation</small></div></div>
    <section className="panel explorer-panel"><div className="explorer-heading"><div><span className="panel-kicker">PRODUCT DATABASE</span><h2>Inventory stock status</h2></div><div className="explorer-tools"><button className="secondary-btn" onClick={exportCsv}><Download size={14}/> Export</button><button className="secondary-btn" onClick={()=>{setLowOnly(false);setCategoryFilter('All categories');setSearch('');setTrieResults([]);setTrieError('');setTrieLoading(false);setInventoryTab('All items');setSkuQuery('');setSkuProduct(null);setSkuLookupError('');setSkuNotFound(false)}}><RotateCw size={14}/> Reset</button><button className="secondary-btn" onClick={fetchProducts}><RefreshCw size={14}/> Refresh</button></div></div>
      <div className="explorer-filters"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>{setTrieResults([]);setTrieError('');setTrieLoading(false);setSearch(e.target.value)}} placeholder="Product-name prefix (Trie search)…" aria-label="Search by product name prefix"/></div><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button className={`secondary-btn ${lowOnly?'chosen':''}`} onClick={()=>setLowOnly(v=>!v)}><ListFilter size={14}/> Low stock only</button></div>
      <div className="tabs explorer-tabs">{['All items','Low stock','In stock'].map(t=><button key={t} className={inventoryTab===t?'active':''} onClick={()=>setInventoryTab(t)}>{t}{t==='Low stock'&&<em>{lowStock.length}</em>}</button>)}</div>
      {productTable(filteredProducts)}
      <div className="table-bottom"><span>Showing {filteredProducts.length} of {products.length} products</span><span>Inventory data · MySQL via Spring Boot API</span></div>
    </section>
    <section className="panel dsa-lookup-panel"><PanelHead kicker="HASHMAP SKU LOOKUP" title="Find a product by exact SKU"/><form className="dsa-search-form" onSubmit={lookupSku}><div className="search-field"><ScanSearch size={16}/><input value={skuQuery} onChange={event=>{setSkuQuery(event.target.value);setSkuLookupError('');setSkuNotFound(false);setSkuProduct(null)}} placeholder="Enter exact SKU" aria-label="SKU to look up"/></div><button className="primary-btn" type="submit" disabled={skuLookupBusy}>{skuLookupBusy?'Looking up…':'Look up SKU'}</button></form>
      {skuLookupError&&<div className="dsa-feedback error" role="alert">{skuLookupError}</div>}{skuNotFound&&<div className="dsa-feedback empty" role="status">No product was found for SKU “{skuQuery.trim()}”.</div>}
      {skuProduct&&<div className="sku-result-card"><div className="sku-result-title"><span className="product-icon"><Package size={16}/></span><div><b>{skuProduct.name}</b><small>{skuProduct.sku} · {skuProduct.category||'Uncategorised'}</small></div><Status value={productStatus(skuProduct)}/></div><div className="sku-result-metrics"><div><small>Current quantity</small><b>{number(skuProduct.quantity)} units</b></div><div><small>Unallocated</small><b>{skuProduct.unallocatedQuantity===undefined?'Unavailable':`${number(skuProduct.unallocatedQuantity)} units`}</b></div><div><small>Reorder level</small><b>{number(skuProduct.reorderLevel)}</b></div><div><small>Daily demand</small><b>{skuProduct.dailyDemand===undefined?'Unavailable':`${number(skuProduct.dailyDemand)} / day`}</b></div></div></div>}
    </section>
    <div className="feature-note"><ScanSearch size={18}/><div><b>Backend-powered product search</b><span>Name search is a prefix query through the Trie endpoint. SKU lookup requests an exact match from the backend HashMap endpoint. API errors are shown without local search fallback.</span></div></div>
  </>

  const renderPurchaseStock = () => {
    const selectedProduct = products.find(item => String(item.id) === purchaseProductId)
    const selectedShelf = shelves.find(item => String(item.id) === purchaseShelfId)
    const availableCapacity = selectedShelf
      ? Math.max(0, Number(selectedShelf.maxCapacity) - Number(selectedShelf.currentQuantity))
      : null
    const requestedQuantity = Number(purchaseQuantity)
    const exceedsCapacity = selectedShelf && Number.isInteger(requestedQuantity)
      && requestedQuantity > availableCapacity

    return <>
      <PageTitle eyebrow="INVENTORY MOVEMENT · INBOUND" title="Purchase Stock" description="Record incoming stock against a product and its destination shelf." action={<button className="secondary-btn" onClick={async()=>{const wasUncertain=purchaseReconciliationNeeded;const result=await refreshPurchaseInventory();setPurchaseError(result.refreshed?(wasUncertain?'Inventory and shelf data were refreshed. Check transaction history before retrying the earlier request.':''):'Could not refresh both inventory and shelves. Another purchase remains blocked until refresh succeeds.')}} disabled={loading||shelvesLoading||purchaseBusy||purchaseRefreshBusy}><RefreshCw size={14}/> Refresh data</button>}/>
      <div className="purchase-layout">
        <section className="panel purchase-panel">
          <PanelHead kicker="NEW STOCK RECEIPT" title="Purchase details" right={<span className="purchase-secure"><ShieldCheck size={14}/> Authenticated transaction</span>}/>
          {purchaseNotice&&<div className="purchase-feedback purchase-success" role="status"><CheckCircle2 size={16}/><span>{purchaseNotice}</span></div>}
          {purchaseError&&<div className="purchase-feedback purchase-failure" role="alert"><AlertTriangle size={16}/><span>{purchaseError}</span></div>}
          {shelvesError&&<div className="purchase-feedback purchase-failure" role="alert"><Warehouse size={16}/><span>{shelvesError}</span><button type="button" onClick={fetchShelves}>Retry</button></div>}

          {!loading&&productsError ? <div className="purchase-empty"><Empty text={`Product catalogue unavailable: ${productsError}`}/><button className="secondary-btn" onClick={fetchProducts}>Retry product loading</button></div> : products.length===0&&!loading ? <div className="purchase-empty"><Empty text="No products are available to purchase. Add a product first, then refresh this page."/></div> :
          <form className="purchase-form" onSubmit={submitPurchase} noValidate>
            <label className="purchase-field purchase-field-wide">Product
              <select value={purchaseProductId} onChange={e=>{setPurchaseProductId(e.target.value);setPurchaseError('')}} disabled={loading||purchaseBusy} required>
                <option value="">{loading?'Loading products…':'Choose a product'}</option>
                {products.map(product=><option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
              </select>
            </label>

            {selectedProduct&&<div className="purchase-current-stock">
              <div className="purchase-stock-icon"><PackageCheck size={18}/></div>
              <div><small>CURRENT PRODUCT STOCK</small><b>{number(selectedProduct.quantity)} <span>units</span></b></div>
              <span className="purchase-sku">{selectedProduct.sku}</span>
            </div>}

            <label className="purchase-field">Purchase quantity
              <input type="number" min="1" step="1" inputMode="numeric" value={purchaseQuantity} onChange={e=>{setPurchaseQuantity(e.target.value);setPurchaseError('')}} placeholder="Enter units" disabled={purchaseBusy} required/>
            </label>
            <label className="purchase-field">Unit purchase price (₹)
              <input type="number" min="0" step="0.0001" inputMode="decimal" value={purchaseUnitPrice} onChange={e=>{setPurchaseUnitPrice(e.target.value);setPurchaseError('')}} placeholder="0.0000" disabled={purchaseBusy} required/>
            </label>

            <label className="purchase-field purchase-field-wide">Destination shelf
              <select value={purchaseShelfId} onChange={e=>{setPurchaseShelfId(e.target.value);setPurchaseError('')}} disabled={shelvesLoading||purchaseBusy} required>
                <option value="">{shelvesLoading?'Loading warehouse shelves…':'Choose a shelf'}</option>
                {shelves.map(shelf=>{
                  const remaining=Math.max(0,Number(shelf.maxCapacity)-Number(shelf.currentQuantity))
                  return <option key={shelf.id} value={shelf.id} disabled={remaining===0}>
                    {shelf.rackCode ? `${shelf.rackCode} · ` : ''}{shelf.code} — {number(remaining)} units free
                  </option>
                })}
              </select>
              {selectedShelf&&<small className="purchase-field-hint">{number(selectedShelf.currentQuantity)} of {number(selectedShelf.maxCapacity)} units used · {number(availableCapacity)} units available</small>}
              {!shelvesLoading&&shelves.length===0&&!shelvesError&&<small className="purchase-field-hint">No shelves are configured yet. Create a warehouse shelf before purchasing stock.</small>}
              {!shelvesLoading&&shelves.length>0&&shelves.every(shelf=>Number(shelf.currentQuantity)>=Number(shelf.maxCapacity))&&<small className="purchase-capacity-hint">All configured shelves are at capacity. Increase available shelf capacity before recording this purchase.</small>}
            </label>

            {exceedsCapacity&&<div className="purchase-capacity-warning"><AlertTriangle size={15}/><span>Quantity exceeds this shelf’s available capacity by {number(requestedQuantity-availableCapacity)} units.</span></div>}

            <label className="purchase-field purchase-field-wide">Supplier / purchase reference
              <input type="text" maxLength="160" value={purchaseReference} onChange={e=>{setPurchaseReference(e.target.value);setPurchaseError('')}} placeholder="Supplier name, invoice or purchase order" disabled={purchaseBusy} required/>
            </label>
            <label className="purchase-field purchase-field-wide">Notes <span className="optional-label">Optional</span>
              <textarea maxLength="1000" rows="3" value={purchaseNotes} onChange={e=>setPurchaseNotes(e.target.value)} placeholder="Additional receipt details" disabled={purchaseBusy}/>
            </label>

            <div className="purchase-form-foot">
              <span><ShieldCheck size={14}/> Stock and ledger update together</span>
              <button className="primary-btn purchase-submit" type="submit" disabled={purchaseBusy||purchaseRefreshBusy||purchaseReconciliationNeeded||loading||Boolean(productsError)||shelvesLoading||Boolean(shelvesError)||products.length===0||shelves.length===0}>
                <ArrowDownToLine size={15}/>{purchaseBusy?'Recording purchase…':purchaseRefreshBusy?'Refreshing inventory…':'Record purchase'}
              </button>
            </div>
          </form>}
        </section>

        <aside className="panel purchase-summary-panel">
          <span className="panel-kicker">RECEIPT SUMMARY</span>
          <h2>Incoming inventory</h2>
          <p>Review the selected item and destination before recording the purchase.</p>
          <div className="purchase-summary-product">
            <span className="purchase-summary-icon"><Package size={18}/></span>
            <div><b>{selectedProduct?.name||'No product selected'}</b><small>{selectedProduct?.sku||'Product SKU'}</small></div>
          </div>
          <div className="purchase-summary-row"><span>Current stock</span><b>{selectedProduct?`${number(selectedProduct.quantity)} units`:'—'}</b></div>
          <div className="purchase-summary-row"><span>Incoming quantity</span><b>{Number.isInteger(requestedQuantity)&&requestedQuantity>0?`${number(requestedQuantity)} units`:'—'}</b></div>
          <div className="purchase-summary-row"><span>Unit price</span><b>{purchaseUnitPrice!==''&&Number.isFinite(Number(purchaseUnitPrice))?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(purchaseUnitPrice)):'—'}</b></div>
          <div className="purchase-summary-row"><span>Destination</span><b>{selectedShelf?`${selectedShelf.rackCode ? `${selectedShelf.rackCode} · ` : ''}${selectedShelf.code}`:'—'}</b></div>
          <div className="purchase-summary-total"><span>Stock after purchase</span><b>{selectedProduct&&Number.isInteger(requestedQuantity)&&requestedQuantity>0?`${number(Number(selectedProduct.quantity)+requestedQuantity)} units`:'—'}</b><small>Estimated from current product stock</small></div>
          <div className="purchase-summary-note"><Truck size={15}/><span>The backend confirms shelf capacity and commits the purchase, inventory quantity and ledger entry atomically.</span></div>
        </aside>
      </div>
    </>
  }

  const renderSellStock = () => {
    const selectedProduct = products.find(item => String(item.id) === saleProductId)
    const selectedShelf = saleShelves.find(item => String(item.id) === saleShelfId)
    const shelfQuantity = selectedShelf ? Number(saleAllocations[String(selectedShelf.id)] || 0) : null
    const availableStock = selectedProduct && selectedShelf
      ? Math.min(Number(selectedProduct.quantity), shelfQuantity)
      : null
    const requestedQuantity = Number(saleQuantity)
    const exceedsStock = availableStock !== null && Number.isInteger(requestedQuantity)
      && requestedQuantity > availableStock
    const allocatedAcrossShelves = selectedProduct
      ? Object.values(saleAllocations).reduce((total, value) => total + Number(value || 0), 0)
      : 0

    return <>
      <PageTitle eyebrow="INVENTORY MOVEMENT · OUTBOUND" title="Sell Stock" description="Record a sale from a shelf with available product stock." action={<button className="secondary-btn" onClick={async()=>{const wasUncertain=saleReconciliationNeeded;const result=await refreshSaleInventory();setSaleError(result.refreshed?(wasUncertain?'Product and shelf allocations were refreshed. Check transaction history before retrying the earlier request.':''):'Could not refresh product, shelf and allocation data. Another sale remains blocked until refresh succeeds.')}} disabled={loading||saleShelvesLoading||saleAllocationsLoading||saleBusy||saleRefreshBusy}><RefreshCw size={14}/> Refresh data</button>}/>
      <div className="purchase-layout">
        <section className="panel purchase-panel">
          <PanelHead kicker="NEW STOCK DISPATCH" title="Sale details" right={<span className="sale-secure"><ShieldCheck size={14}/> Authenticated transaction</span>}/>
          {saleNotice&&<div className="purchase-feedback purchase-success" role="status"><CheckCircle2 size={16}/><span>{saleNotice}</span></div>}
          {saleError&&<div className="purchase-feedback purchase-failure" role="alert"><AlertTriangle size={16}/><span>{saleError}</span></div>}
          {saleShelvesError&&<div className="purchase-feedback purchase-failure" role="alert"><Warehouse size={16}/><span>{saleShelvesError}</span><button type="button" onClick={async()=>{const result=await fetchSaleShelves();if(result.ok&&saleProductId)await fetchSaleAllocations(saleProductId,result.shelves,result.inventoryByShelf)}}>Retry</button></div>}
          {saleAllocationsError&&<div className="purchase-feedback purchase-failure" role="alert"><Package size={16}/><span>{saleAllocationsError}</span><button type="button" onClick={()=>fetchSaleAllocations(saleProductId)}>Retry</button></div>}

          {!loading&&productsError ? <div className="purchase-empty"><Empty text={`Product catalogue unavailable: ${productsError}`}/><button className="secondary-btn" onClick={fetchProducts}>Retry product loading</button></div> : products.length===0&&!loading ? <div className="purchase-empty"><Empty text="No products are available to sell."/></div> :
          <form className="purchase-form" onSubmit={submitSale} noValidate>
            <label className="purchase-field purchase-field-wide">Product
              <select value={saleProductId} onChange={e=>{const productId=e.target.value;setSaleProductId(productId);setSaleShelfId('');setSaleAllocations({});setSaleError('');if(productId)fetchSaleAllocations(productId)}} disabled={loading||saleShelvesLoading||saleBusy||saleRefreshBusy} required>
                <option value="">{loading?'Loading products…':'Choose a product'}</option>
                {products.map(product=><option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
              </select>
            </label>

            {selectedProduct&&<div className="purchase-current-stock">
              <div className="sale-stock-icon"><PackageCheck size={18}/></div>
              <div><small>CURRENT PRODUCT STOCK</small><b>{number(selectedProduct.quantity)} <span>units</span></b></div>
              <span className="purchase-sku">{selectedProduct.sku}</span>
            </div>}

            <label className="purchase-field purchase-field-wide">Source shelf
              <select value={saleShelfId} onChange={e=>{setSaleShelfId(e.target.value);setSaleError('')}} disabled={!saleProductId||saleShelvesLoading||saleAllocationsLoading||saleBusy||saleRefreshBusy} required>
                <option value="">{saleShelvesLoading?'Loading warehouse shelves…':saleAllocationsLoading?'Loading product allocations…':'Choose a shelf with stock'}</option>
                {saleShelves.filter(shelf=>Number(saleAllocations[String(shelf.id)]||0)>0).map(shelf=><option key={shelf.id} value={shelf.id}>
                  {shelf.rackCode ? `${shelf.rackCode} · ` : ''}{shelf.code} — {number(saleAllocations[String(shelf.id)])} units of this product
                </option>)}
              </select>
              {selectedShelf&&<small className="purchase-field-hint">This shelf has {number(shelfQuantity)} units of {selectedProduct?.name}.</small>}
              {saleProductId&&!saleShelvesLoading&&!saleAllocationsLoading&&saleShelves.length===0&&!saleShelvesError&&<small className="purchase-field-hint">No warehouse shelves are configured. Create a shelf and allocate stock before selling.</small>}
              {saleProductId&&!saleAllocationsLoading&&!saleAllocationsError&&saleShelves.length>0&&allocatedAcrossShelves===0&&<small className="purchase-capacity-hint">This product has no allocated shelf stock available for sale.</small>}
            </label>

            <label className="purchase-field">Sale quantity
              <input type="number" min="1" step="1" max={availableStock??undefined} inputMode="numeric" value={saleQuantity} onChange={e=>{setSaleQuantity(e.target.value);setSaleError('')}} placeholder="Enter units" disabled={!selectedShelf||saleBusy||saleRefreshBusy||saleAllocationsLoading} required/>
            </label>
            <label className="purchase-field">Unit selling price (₹)
              <input type="number" min="0" step="0.0001" inputMode="decimal" value={saleUnitPrice} onChange={e=>{setSaleUnitPrice(e.target.value);setSaleError('')}} placeholder="0.0000" disabled={saleBusy||saleRefreshBusy} required/>
            </label>

            {exceedsStock&&<div className="purchase-capacity-warning sale-stock-warning"><AlertTriangle size={15}/><span>Quantity exceeds this shelf’s available stock by {number(requestedQuantity-availableStock)} units.</span></div>}

            <label className="purchase-field purchase-field-wide">Customer / order reference
              <input type="text" maxLength="160" value={saleReference} onChange={e=>{setSaleReference(e.target.value);setSaleError('')}} placeholder="Customer name, invoice or sales order" disabled={saleBusy} required/>
            </label>
            <label className="purchase-field purchase-field-wide">Notes <span className="optional-label">Optional</span>
              <textarea maxLength="1000" rows="3" value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} placeholder="Additional dispatch details" disabled={saleBusy}/>
            </label>

            <div className="purchase-form-foot">
              <span><ShieldCheck size={14}/> Sale and ledger update together</span>
              <button className="primary-btn purchase-submit sale-submit" type="submit" disabled={saleBusy||saleRefreshBusy||saleReconciliationNeeded||loading||Boolean(productsError)||saleShelvesLoading||Boolean(saleShelvesError)||saleAllocationsLoading||Boolean(saleAllocationsError)||products.length===0||!saleShelfId}>
                <ArrowUpFromLine size={15}/>{saleBusy?'Recording sale…':saleRefreshBusy?'Refreshing inventory…':'Record sale'}
              </button>
            </div>
            <small className="sale-workflow-hint">Each sale is recorded from one source shelf. For stock on multiple shelves, submit a separate sale for each shelf.</small>
          </form>}
        </section>

        <aside className="panel purchase-summary-panel sale-summary-panel">
          <span className="panel-kicker">DISPATCH SUMMARY</span>
          <h2>Outgoing inventory</h2>
          <p>Only stock allocated to the selected source shelf can be sold.</p>
          <div className="purchase-summary-product">
            <span className="sale-summary-icon"><Package size={18}/></span>
            <div><b>{selectedProduct?.name||'No product selected'}</b><small>{selectedProduct?.sku||'Product SKU'}</small></div>
          </div>
          <div className="purchase-summary-row"><span>Total product stock</span><b>{selectedProduct?`${number(selectedProduct.quantity)} units`:'—'}</b></div>
          <div className="purchase-summary-row"><span>Stock on source shelf</span><b>{selectedShelf?`${number(shelfQuantity)} units`:'—'}</b></div>
          <div className="purchase-summary-row"><span>Sale quantity</span><b>{Number.isInteger(requestedQuantity)&&requestedQuantity>0?`${number(requestedQuantity)} units`:'—'}</b></div>
          <div className="purchase-summary-row"><span>Unit selling price</span><b>{saleUnitPrice!==''&&Number.isFinite(Number(saleUnitPrice))?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:4}).format(Number(saleUnitPrice)):'—'}</b></div>
          <div className="purchase-summary-row"><span>Source shelf</span><b>{selectedShelf?`${selectedShelf.rackCode ? `${selectedShelf.rackCode} · ` : ''}${selectedShelf.code}`:'—'}</b></div>
          <div className="purchase-summary-total sale-summary-total"><span>Product stock after sale</span><b>{selectedProduct&&Number.isInteger(requestedQuantity)&&requestedQuantity>0?`${number(Number(selectedProduct.quantity)-requestedQuantity)} units`:'—'}</b><small>Estimated from current product stock</small></div>
          <div className="purchase-summary-note"><Truck size={15}/><span>The backend rechecks selected-shelf stock and commits the product quantity, shelf allocation and sale ledger entry atomically.</span></div>
        </aside>
      </div>
    </>
  }

  const renderStockIntelligence = () => {
    const priorityRank = new Map(stockPriority.map((product, index) => [String(product.id), index + 1]))
    const inventoryOrder = [...products].sort((a, b) => {
      const rankA = priorityRank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER
      const rankB = priorityRank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER
      return rankA - rankB || String(a.name || '').localeCompare(String(b.name || ''))
    })
    const statusFor = product => Number(product.quantity) <= 0 ? 'Out of Stock' : Number(product.quantity) <= Number(product.reorderLevel) ? 'Low Stock' : 'Healthy'
    const renderPriorityProduct = (product, index) => {
      const demand = Number(product.dailyDemand || 0)
      const daysRemaining = demand > 0 ? Number(product.quantity) / demand : null
      return <div className="intelligence-priority-row" key={product.id}>
        <span className="priority-rank">{String(index + 1).padStart(2, '0')}</span>
        <div className="intelligence-product"><b>{product.name}</b><small>{product.sku}{product.category ? ` · ${product.category}` : ''}</small></div>
        <div className="intelligence-number"><small>ON HAND</small><b>{number(product.quantity)} units</b></div>
        <div className="intelligence-number"><small>REORDER AT</small><b>{number(product.reorderLevel)}</b></div>
        <div className="intelligence-number"><small>DAILY DEMAND</small><b>{demand > 0 ? `${number(demand)} / day` : 'Not set'}</b></div>
        <div className="intelligence-number"><small>DAYS REMAINING</small><b className={daysRemaining !== null && daysRemaining <= 3 ? 'red-text' : ''}>{daysRemaining === null ? '—' : `${daysRemaining.toFixed(1)} days`}</b></div>
        <Status value={statusFor(product)}/>
      </div>
    }
    return <>
      <PageTitle eyebrow="SMART STOCKOUT PREVENTION" title="Stock Intelligence" description="Live stock health, demand coverage and ledger-backed restocking priorities." action={<button className="secondary-btn" onClick={refreshStockIntelligence}><RefreshCw size={14}/> Refresh intelligence</button>}/>
      <div className="intelligence-kpis">
        <Kpi icon={Package} label="Products" value={loading && products.length === 0 ? '…' : number(products.length)} detail="Live product catalogue" color="blue"/>
        <Kpi icon={Boxes} label="Units on hand" value={loading && products.length === 0 ? '…' : number(totalUnits)} detail="Current product quantities" color="teal"/>
        <Kpi icon={AlertTriangle} label="Low stock" value={loading && products.length === 0 ? '…' : number(lowStock.length)} detail="At or below reorder level" color="amber"/>
        <Kpi icon={PackageCheck} label="Out of stock" value={loading && products.length === 0 ? '…' : number(outOfStock.length)} detail="Zero or negative on hand" color="purple"/>
        <Kpi icon={ArrowDownToLine} label="Purchased units" value={stockLedgerLoading ? '…' : stockLedgerError ? '—' : number(actualPurchasedUnits)} detail="Recorded PURCHASE transactions" color="green"/>
        <Kpi icon={ArrowUpFromLine} label="Sold units" value={stockLedgerLoading ? '…' : stockLedgerError ? '—' : number(actualSoldUnits)} detail="Recorded SALE transactions" color="blue"/>
      </div>
      {productsError && <div className="error-banner"><AlertTriangle size={16}/><span>Could not refresh the product catalogue ({productsError}). Any inventory still shown may be stale.</span></div>}
      <div className="intelligence-layout">
        <section className="panel intelligence-priority-panel">
          <PanelHead kicker="MIN HEAP · LIVE API ORDER" title="Restocking priority" right={<span className="count-chip">{stockPriorityLoading ? 'Loading…' : `${stockPriority.length} ranked`}</span>}/>
          <p className="panel-description">Ranked by the existing backend Min Heap using current quantity and daily demand. Products with no positive demand have no estimated coverage.</p>
          {stockPriorityError ? <div className="error-banner"><AlertTriangle size={16}/><span>Priority ranking unavailable: {stockPriorityError}</span></div> : stockPriorityLoading && stockPriority.length === 0 ? <Empty text="Loading restocking priorities…"/> : stockPriority.length === 0 ? <Empty text="No products are currently at or below their reorder level."/> : <div className="intelligence-priority-list">{stockPriority.map(renderPriorityProduct)}</div>}
        </section>
        <aside className="panel intelligence-source-panel">
          <span className="panel-kicker">DATA SOURCES</span>
          <div className="logic-icon"><Zap size={22}/></div>
          <h2>Inventory signals</h2>
          <div className="logic-stat"><span>Products with demand set</span><b>{products.filter(product => Number(product.dailyDemand) > 0).length} / {products.length}</b></div>
          <div className="logic-stat"><span>Ledger transactions</span><b>{stockLedgerLoading ? 'Loading…' : stockLedgerError ? 'Unavailable' : number(stockLedger.length)}</b></div>
          <p className="intelligence-source-note">Purchase and sale totals count only recorded PURCHASE and SALE ledger entries. Opening stock and adjustments are excluded.</p>
          {stockLedgerError && <div className="intelligence-inline-error">Transaction history unavailable: {stockLedgerError}</div>}
          <button className="panel-link intelligence-report-link" onClick={()=>goTo('Monthly Stock Report')}>Open monthly stock report <ArrowUpRight size={14}/></button>
        </aside>
      </div>
      <section className="panel intelligence-inventory-panel">
        <PanelHead kicker="CURRENT STOCK + RECORDED MOVEMENTS" title="Inventory signals by product" right={<span className="soft-label">{stockLedgerLoading ? 'Loading ledger…' : stockLedgerError ? 'Ledger unavailable' : 'Ledger data loaded'}</span>}/>
        <p className="panel-description">Heap-ranked products appear first. Movement totals are cumulative recorded quantities; they do not include opening-stock baselines or adjustments.</p>
        {loading && products.length === 0 ? <Empty text="Loading product inventory…"/> : products.length === 0 ? <Empty text={productsError ? 'Product inventory could not be loaded.' : 'The product catalogue is empty.'}/> : <div className="table-scroll"><table className="data-table intelligence-table"><thead><tr><th>HEAP RANK</th><th>PRODUCT</th><th>ON HAND</th><th>REORDER LEVEL</th><th>DAILY DEMAND</th><th>DAYS REMAINING</th><th>PURCHASED</th><th>SOLD</th><th>STATUS</th></tr></thead><tbody>
          {inventoryOrder.map(product => {
            const demand = Number(product.dailyDemand || 0)
            const daysRemaining = demand > 0 ? Number(product.quantity) / demand : null
            const movement = stockLedgerTotals[String(product.id)] || { purchased: 0, sold: 0 }
            return <tr key={product.id}>
              <td>{priorityRank.has(String(product.id)) ? <span className="intelligence-rank-chip">#{priorityRank.get(String(product.id))}</span> : '—'}</td>
              <td><div className="product-ident"><span className="product-icon"><Package size={16}/></span><span><b>{product.name}</b><small>{product.sku}{product.category ? ` · ${product.category}` : ''}</small></span></div></td>
              <td><b>{number(product.quantity)}</b><small className="unit-label">units</small></td>
              <td>{number(product.reorderLevel)}</td>
              <td>{demand > 0 ? `${number(demand)} / day` : 'Not set'}</td>
              <td>{daysRemaining === null ? '—' : `${daysRemaining.toFixed(1)} days`}</td>
              <td>{stockLedgerError ? '—' : number(movement.purchased)}</td>
              <td>{stockLedgerError ? '—' : number(movement.sold)}</td>
              <td><Status value={statusFor(product)}/></td>
            </tr>
          })}
        </tbody></table></div>}
      </section>
      <div className="feature-note"><AlertTriangle size={18}/><div><b>Review before ordering</b><span>Priority ranks come from the backend Min Heap. Estimated days remaining is current quantity divided by the product's configured daily demand; no purchase order is created automatically.</span></div></div>
    </>
  }

  const renderMonthlyStockReport = () => {
    const months = monthlyReport?.months || []
    const selectedMonth = months[0]
    const [selectedYear, selectedMonthNumber] = monthlyReportSelection.split('-').map(Number)
    const selectedLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(selectedYear, selectedMonthNumber - 1, 1)))
    const selectMonth = value => {
      setMonthlyReportSelection(value)
      void fetchMonthlyStockReport(value)
    }
    const metric = value => value === null || value === undefined ? 'Unavailable' : number(value)
    const adjustment = (increase, decrease) => increase === null || increase === undefined || decrease === null || decrease === undefined
      ? 'Unavailable'
      : `+${number(increase)} / −${number(decrease)}`
    const openingValue = month => {
      if (month.openingStock === null || month.openingStock === undefined) return 'Unavailable'
      return month.openingStockComplete ? number(month.openingStock) : `${number(month.openingStock)} known · incomplete`
    }
    const statusLabel = status => status === 'NO_HISTORICAL_TRANSACTION_DATA' ? 'No historical data' : 'Available from opening stock'
    return <>
      <PageTitle eyebrow="INVENTORY REPORTING" title="Monthly Stock Report" description="Inspect ledger-backed stock movement for a selected calendar month." action={<div className="report-month-controls"><button type="button" className="tiny-icon" aria-label="Previous month" onClick={()=>selectMonth(shiftMonth(monthlyReportSelection,-1))}>‹</button><input aria-label="Select report month" type="month" value={monthlyReportSelection} onChange={event=>event.target.value&&selectMonth(event.target.value)}/><button type="button" className="tiny-icon" aria-label="Next month" onClick={()=>selectMonth(shiftMonth(monthlyReportSelection,1))}>›</button><button className="secondary-btn" onClick={()=>fetchMonthlyStockReport()}><RefreshCw size={14}/> Refresh</button></div>}/>
      <div className="report-kpis">
        <Kpi icon={CalendarClock} label="Selected month" value={selectedLabel} detail="Asia/Kolkata reporting dates" color="blue"/>
        <Kpi icon={AlertTriangle} label="History status" value={selectedMonth ? statusLabel(selectedMonth.status) : '—'} detail="Based on recorded opening and movements" color="amber"/>
        <Kpi icon={Boxes} label="Opening stock" value={selectedMonth ? openingValue(selectedMonth) : '—'} detail={selectedMonth?.coverageStart ? `Coverage starts ${selectedMonth.coverageStart}` : 'No opening baseline recorded'} color="teal"/>
        <Kpi icon={Zap} label="Restock suggestions" value={selectedMonth?.restockSuggestionsAvailable ? metric(selectedMonth.restockSuggestionCount) : 'Unavailable'} detail="Requires a supported closing balance" color="purple"/>
      </div>
      <div className="report-coverage-note"><CalendarClock size={17}/><div><b>Coverage follows each product’s recorded opening date</b><span>Months before an opening-stock entry remain unavailable. From a product’s initial stock entry onward, the report rolls forward only recorded purchases, sales and signed adjustments; opening stock is never counted as a purchase.</span></div></div>
      {monthlyReportError && <div className="error-banner"><AlertTriangle size={16}/><span>{monthlyReportError}</span><button onClick={fetchMonthlyStockReport}>Retry</button></div>}
      {monthlyReportLoading && !monthlyReport ? <section className="panel report-empty"><Empty text="Loading monthly stock report…"/></section> : !monthlyReportError && monthlyReport && months.length === 0 ? <section className="panel report-empty"><Empty text="The report API returned no monthly data."/></section> : monthlyReport && <>
        <section className="panel monthly-report-panel">
          <PanelHead kicker="MONTHLY OVERVIEW" title={`Stock movement · ${selectedLabel}`} right={<span className="soft-label">Reporting timezone · {monthlyReport.reportingTimezone}</span>}/>
          <div className="table-scroll"><table className="data-table monthly-report-table"><thead><tr><th>MONTH</th><th>COVERAGE</th><th>OPENING STOCK</th><th>LATER OPENING STOCK</th><th>PURCHASES</th><th>SALES</th><th>ADJUSTMENTS ↑ / ↓</th><th>CLOSING STOCK</th><th>RESTOCK SUGGESTIONS</th></tr></thead><tbody>
            {months.map(month => <tr key={month.month}>
              <td><b>{month.monthName}</b><small className="unit-label">{monthlyReport.year}</small></td>
              <td><Status value={statusLabel(month.status)}/>{month.coverageStart&&<small className="report-coverage-dates">{month.coverageStart}{month.coverageEnd?` – ${month.coverageEnd}`:' – pending'}</small>}</td>
              <td>{openingValue(month)}</td>
              <td>{metric(month.subsequentOpeningStock)}</td>
              <td>{metric(month.purchasedQuantity)}</td>
              <td>{metric(month.soldQuantity)}</td>
              <td>{adjustment(month.adjustmentIncrease, month.adjustmentDecrease)}{month.adjustmentQuantity!==null&&month.adjustmentQuantity!==undefined&&<small className="unit-label">{number(month.adjustmentQuantity)} total</small>}</td>
              <td>{month.closingStockComplete ? metric(month.closingStock) : 'Unavailable'}</td>
              <td>{month.restockSuggestionsAvailable ? metric(month.restockSuggestionCount) : 'Unavailable'}</td>
            </tr>)}
          </tbody></table></div>
        </section>
        {months.filter(month=>month.products?.length>0).map(month=><section className="panel monthly-product-panel" key={`products-${month.month}`}>
          <PanelHead kicker={`${month.monthName.toUpperCase()} · PRODUCT DETAIL`} title="Product-level balances" right={<span className="soft-label">Coverage starts · {month.coverageStart}</span>}/>
          <div className="table-scroll"><table className="data-table monthly-product-table"><thead><tr><th>PRODUCT</th><th>OPENING STOCK</th><th>LATER OPENING STOCK</th><th>PURCHASED</th><th>SOLD</th><th>ADJUSTMENTS ↑ / ↓</th><th>CLOSING STOCK</th><th>EST. DAYS LEFT</th><th>RESTOCK</th></tr></thead><tbody>
            {month.products.map(product => <tr key={product.productId}>
              <td><div className="product-ident"><span className="product-icon"><Package size={16}/></span><span><b>{product.productName}</b><small>{product.sku}</small></span></div></td>
              <td>{metric(product.openingStock)}</td><td>{metric(product.subsequentOpeningStock)}</td>
              <td>{metric(product.purchasedQuantity)}</td><td>{metric(product.soldQuantity)}</td>
              <td>{adjustment(product.adjustmentIncrease, product.adjustmentDecrease)}{product.adjustmentQuantity!==null&&product.adjustmentQuantity!==undefined&&<small className="unit-label">{number(product.adjustmentQuantity)} total</small>}</td>
              <td>{metric(product.closingStock)}</td>
              <td>{product.estimatedDaysRemaining===null||product.estimatedDaysRemaining===undefined?'Unavailable':`${Number(product.estimatedDaysRemaining).toFixed(1)} days`}</td>
              <td>{product.restockSuggested===null||product.restockSuggested===undefined?'Unavailable':product.restockSuggested?'Review':'No review'}</td>
            </tr>)}
          </tbody></table></div>
        </section>)}
      </>}
      <div className="feature-note"><AlertTriangle size={18}/><div><b>Missing history is not treated as zero</b><span>Only movements recorded in the stock transaction ledger are included. Closing balances and restock suggestions are shown only when an opening transaction and signed movements support the calculation.</span></div></div>
    </>
  }

  const renderAnalytics = () => {
    const categoryData=categories.map(category=>({category,units:products.filter(p=>(p.category||'Uncategorised')===category).reduce((sum,p)=>sum+Number(p.quantity||0),0)})).sort((a,b)=>b.units-a.units)
    const max=Math.max(1,...categoryData.map(x=>x.units))
    return <>
      <PageTitle eyebrow="INVENTORY INTELLIGENCE" title="Analytics" description="Explore inventory composition and stock value using your current product records." action={<button className="secondary-btn" onClick={exportCsv}><Download size={14}/> Export report</button>}/>
      <div className="kpi-grid analytics-kpis"><Kpi icon={Boxes} label="Total stock units" value={number(totalUnits)} detail="Current product quantities" color="blue"/><Kpi icon={CircleDollarSign} label="Inventory valuation" value={money(stockValue)} detail="Quantity × unit price" color="green"/><Kpi icon={AlertTriangle} label="Low stock rate" value={`${products.length?Math.round(lowStock.length/products.length*100):0}%`} detail="Share of product catalogue" color="amber"/><Kpi icon={Layers3} label="Product categories" value={categories.length} detail="Distinct category labels" color="purple"/></div>
      <div className="analytics-layout"><section className="panel"><PanelHead kicker="CATEGORY MIX" title="Stock units by category"/>{categoryData.length?categoryData.map(c=><div className="category-bar" key={c.category}><div><b>{c.category}</b><span>{number(c.units)} units</span></div><div className="bar-track"><i style={{width:`${c.units/max*100}%`}}/></div></div>):<Empty text="Add products to generate category analytics."/>}</section><section className="panel"><PanelHead kicker="STOCK HEALTH" title="Inventory status distribution"/><div className="health-donut-wrap"><div className="health-donut" style={{'--health':`${stockHealth}%`}}><div><b>{stockHealth}%</b><small>Healthy</small></div></div><div className="donut-legend"><span><i className="green-dot"/> Healthy <b>{products.length-lowStock.length}</b></span><span><i className="amber-dot"/> Low stock <b>{lowStock.length}</b></span><small>Based on reorder-level comparison.</small></div></div></section></div>
      <section className="panel range-sum-panel"><PanelHead kicker="SEGMENT TREE · RANGE SUM" title="Sum current stock across a product-index range"/><p className="range-sum-explainer">The backend sums current quantities at zero-based, inclusive indexes in the product catalogue sorted by ascending Product ID. This is a catalogue index range, not a date range. Result values come from the Segment Tree API.</p>
        {productsError?<div className="dsa-feedback error" role="alert">The product catalogue is unavailable, so the index range cannot be identified.</div>:loading?<div className="dsa-feedback empty">Loading product catalogue and index bounds…</div>:orderedProducts.length===0?<div className="dsa-feedback empty">No products are available for a range query.</div>:<>
          <div className="range-index-hint">Available indexes: 0–{orderedProducts.length-1} · Sorted by Product ID</div>
          <form className="range-sum-form" onSubmit={runRangeSum}><label>Start index (inclusive)<input type="number" min="0" max={orderedProducts.length-1} step="1" value={rangeStart} onChange={event=>setRangeStart(event.target.value)}/></label><label>End index (inclusive)<input type="number" min="0" max={orderedProducts.length-1} step="1" value={rangeEnd} onChange={event=>setRangeEnd(event.target.value)} placeholder={String(orderedProducts.length-1)}/></label><button className="primary-btn" type="submit" disabled={rangeBusy}>{rangeBusy?'Calculating…':'Calculate range sum'}</button></form>
        </>}
        {rangeError&&<div className="dsa-feedback error" role="alert">{rangeError}</div>}
        {rangeResult&&<div className="range-result" role="status"><div className="range-result-total"><span>Current stock total · indexes {rangeResult.startIndex}–{rangeResult.endIndex}</span><b>{number(rangeResult.totalStock)} units</b></div><div className="range-product-list"><span className="panel-kicker">PRODUCTS INCLUDED IN THIS INDEX RANGE</span>{rangeProducts.map((product,index)=><div key={product.id}><span><b>{rangeResult.startIndex+index} · {product.name}</b><small>SKU {product.sku} · Product ID {product.id}</small></span><strong>{number(product.quantity)} units</strong></div>)}</div></div>}
      </section>
      <div className="feature-note"><ChartNoAxesCombined size={18}/><div><b>Segment Tree query is index-based</b><span>Each request uses inclusive indexes against products ordered by ascending ID. The API returns the total current stock for that range; it does not calculate historical or date-based totals.</span></div></div>
    </>
  }

  const renderOperations = () => <>
    <PageTitle eyebrow="06 — OPERATIONS & ACTIVITY" title="Operations Control" description="Monitor system connectivity, inventory workflows and operational work areas." action={<button className="secondary-btn" onClick={fetchProducts}><RefreshCw size={14}/> Sync inventory</button>}/>
    <div className="operations-layout"><aside className="panel operations-sidebar"><PanelHead kicker="SYSTEM MONITOR" title="Service health" right={<span className={`online-pill ${apiError?'offline':''}`}><i/>{apiError?'Offline':'Connected'}</span>}/><div className="service-card"><div className="service-head"><span><Server size={15}/> Spring Boot API</span><b>{apiError?'Offline':'Online'}</b></div><small>localhost:8080 · /api/products</small><div className="service-foot"><span>Product endpoint</span><CheckCircle2 size={14}/></div></div><div className="service-card"><div className="service-head"><span><Database size={15}/> Inventory database</span><b>{apiError?'Unknown':'Available'}</b></div><small>MySQL · accessed through backend</small><div className="service-foot"><span>Product records loaded</span><b>{products.length}</b></div></div><div className="service-card"><div className="service-head"><span><Cpu size={15}/> DSA services</span><b>Implemented</b></div><small>Heap · Trie · Segment Tree · HashMap</small><div className="service-foot"><span>Algorithm modules</span><b>4</b></div></div><div className="service-refresh"><Wifi size={15}/> {loading?'Checking connection…':apiError?'Connection needs attention':'Frontend data sync complete'}</div></aside>
      <section className="panel operation-board"><div className="operation-board-head"><div><span className="panel-kicker">WAREHOUSE OPERATIONS</span><h2>Operational workboard</h2><p>Live product records paired with illustrative warehouse task cards.</p></div><span className="live-badge"><i/> SYSTEM VIEW</span></div><div className="tabs operation-tabs">{['Live board','Activity log'].map(t=><button key={t} className={operationTab===t?'active':''} onClick={()=>setOperationTab(t)}>{t}</button>)}</div>
        {operationTab==='Live board'?<><div className="operation-stats"><div><Truck size={18}/><b>{queue.length}</b><small>Restock reviews</small></div><div><Package size={18}/><b>{products.length}</b><small>Registered products</small></div><div><Gauge size={18}/><b>{number(totalUnits)}</b><small>Units on hand</small></div></div><div className="task-grid">{[{name:'Inbound receiving',tag:'INBOUND',desc:'Register incoming goods and update quantities.',icon:ArrowDownToLine,status:'Ready'},{name:'Put-away & storage',tag:'STORAGE',desc:'Assign products to warehouse zones and rack locations.',icon:Warehouse,status:'Location data pending'},{name:'Picking & dispatch',tag:'OUTBOUND',desc:'Prepare products for outbound fulfilment.',icon:ArrowUpFromLine,status:'Order data pending'},{name:'Quality inspection',tag:'QUALITY',desc:'Review product condition and stock accuracy.',icon:ShieldCheck,status:'Workflow planned'}].map(t=>{const Icon=t.icon;return <div className="task-card" key={t.tag}><div className="task-card-top"><span><Icon size={18}/></span><small>{t.tag}</small></div><b>{t.name}</b><p>{t.desc}</p><em>{t.status}</em></div>})}</div></>:<div className="activity-empty"><CalendarClock size={28}/><b>No persistent activity log yet</b><span>The current backend does not store audit events. Product changes are saved in MySQL, but historical user actions need an audit-log feature.</span></div>}
      </section></div>
    <section className="panel workflow-panel"><PanelHead kicker="PROJECT ARCHITECTURE" title="Implemented intelligence modules"/><div className="module-grid"><Module icon={Zap} title="Min Heap / PriorityQueue" text="Ranks low-stock products for replenishment."/><Module icon={ScanSearch} title="Trie" text="Supports prefix-based product search."/><Module icon={ChartNoAxesCombined} title="Segment Tree" text="Supports range-sum inventory queries."/><Module icon={Database} title="HashMap" text="Supports quick SKU-based product lookup."/></div></section>
    {apiError&&<div className="error-banner"><AlertTriangle size={16}/>{apiError}</div>}
  </>

  const pageMap={'Command Center':renderCommand,'Warehouse':renderWarehouse,'Warehouse Management':renderWarehouseManagement,'Inventory':renderInventory,'Purchase Stock':renderPurchaseStock,'Sell Stock':renderSellStock,'Stock Intelligence':renderStockIntelligence,'Monthly Stock Report':renderMonthlyStockReport,'Analytics':renderAnalytics,'Operations':renderOperations}
  if (authChecking) return <div className="auth-screen"><div className="auth-card"><div className="brand-mark"><Boxes size={22}/></div><h1>StockWise</h1><p>Securing your workspace…</p></div></div>
  if (!authUser) return <div className="auth-screen"><form className="auth-card" onSubmit={authMode==='login'?handleLogin:handleRegister}>
    <div className="brand-mark"><Boxes size={22}/></div>
    <span className="eyebrow">WAREHOUSE SYSTEMS</span>
    <h1>{authMode==='login'?'Welcome back':'Create your account'}</h1>
    <p>{authMode==='login'?'Sign in to access your StockWise workspace.':'Join StockWise to manage inventory and view warehouse insights.'}</p>
    {authMode==='login' ? <>
      <label>Username<input autoComplete="username" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} required placeholder="Enter your username"/></label>
      <label>Password<input type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required placeholder="Enter your password"/></label>
      {loginError&&<div className="auth-error">{loginError}</div>}
      {registerMessage&&<div style={{color:"#63d6a5",fontSize:13,marginTop:8}}>{registerMessage}</div>}
      <button className="primary-btn auth-submit" disabled={loginBusy}>{loginBusy?'Signing in…':'Sign in securely'}</button>
      <small>New to StockWise? <button type="button" className="auth-switch" style={{background:"none",border:0,color:"#55aaff",cursor:"pointer",font:"inherit",padding:0}} onClick={()=>{setAuthMode('register');setLoginError('');setRegisterMessage('')}}>Create an account</button></small>
    </> : <>
      <label>Username<input autoComplete="username" value={registerUsername} onChange={e=>setRegisterUsername(e.target.value)} required minLength="3" maxLength="80" placeholder="Choose a username"/></label>
      <label>Password<input type="password" autoComplete="new-password" value={registerPassword} onChange={e=>setRegisterPassword(e.target.value)} required minLength="12" placeholder="Create a password (12+ characters)"/></label>
      <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required placeholder="Enter your password again"/></label>
      {registerMessage&&<div className="auth-error">{registerMessage}</div>}
      <button className="primary-btn auth-submit" disabled={registerBusy}>{registerBusy?'Creating account…':'Create account'}</button>
      <small>Already have an account? <button type="button" className="auth-switch" style={{background:"none",border:0,color:"#55aaff",cursor:"pointer",font:"inherit",padding:0}} onClick={()=>{setAuthMode('login');setRegisterMessage('')}}>Sign in</button></small>
      <small>New accounts receive standard User access. Admin tools remain restricted.</small>
    </>}
  </form></div>
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><div className="brand"><div className="brand-mark"><Boxes size={22}/></div><div><b>stockwise<span>.</span></b><small>WAREHOUSE SYSTEMS</small></div><button className="mobile-close" onClick={()=>setMenuOpen(false)}><X size={18}/></button></div><div className="sidebar-label">WORKSPACE</div><nav>{navItems.filter(item=>!item.adminOnly||authUser?.role==='ADMIN').map(item=>{const Icon=item.icon;return <button key={item.name} className={`nav-item ${activePage===item.name?'active':''}`} onClick={()=>goTo(item.name)}><Icon size={18}/><span>{item.name}</span>{activePage===item.name&&<i/>}</button>})}</nav><div className="sidebar-bottom"><div className="sidebar-alert"><span><AlertTriangle size={16}/></span><b>{lowStock.length} stock alerts</b><p>Items need a stock intelligence review.</p><button onClick={()=>goTo('Stock Intelligence')}>Review queue <ArrowUpRight size={13}/></button></div><div className="connection-state"><i className={apiError?'offline':''}/>{apiError?'API disconnected':'System connected'}</div><div className="profile"><div className="avatar">{(authUser?.username||'U').slice(0,1).toUpperCase()}</div><div><b>{authUser?.username}</b><small>{authUser?.role==='ADMIN'?'Administrator':'User'}</small></div><button className="logout-btn" onClick={handleLogout} title="Sign out"><LogOut size={15}/></button></div></div></aside>
    {menuOpen&&<button className="mobile-scrim" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
    <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><b>{activePage}</b></div><div className="topbar-actions"><div className="global-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory…"/><kbd>⌘ K</kbd></div><button className="notification" onClick={()=>goTo('Stock Intelligence')}><Bell size={18}/>{lowStock.length>0&&<i/>}</button><div className="top-avatar">S</div></div></header>
      <div className="page-content">{apiError&&<div className="error-banner"><AlertTriangle size={16}/>{apiError}<button onClick={fetchProducts}>Retry</button></div>}{['Operations','Warehouse Management'].includes(activePage)&&authUser?.role!=='ADMIN'?<div className="error-banner"><ShieldCheck size={16}/> Admin permission is required to access this section.</div>:pageMap[activePage]()}<footer className="footer"><span>STOCKWISE <b>·</b> SMART INVENTORY OPERATIONS</span><span>Connected to local product database</span></footer></div>
    </main>
    {notice&&<div className="toast">{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
    {authUser && <InventoryAssistant secureFetch={secureFetch}/>}
    {showForm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="product-modal" onSubmit={saveProduct}><div className="modal-head"><div><span className="panel-kicker">PRODUCT CATALOGUE</span><h2>{editing?'Edit product':'Add new product'}</h2><p>Enter the product details below.</p></div><button type="button" className="tiny-icon" onClick={()=>setShowForm(false)}><X size={17}/></button></div><div className="form-grid"><label className="wide">Product name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Wireless Mouse"/></label><label>SKU<input required value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="e.g. WM-001"/></label><label>Category<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Electronics"/></label><label>Quantity<input required type="number" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label><label>Reorder level<input required type="number" min="0" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:e.target.value})}/></label><label>Unit price (₹)<input required type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Daily demand<input required type="number" min="0" step="0.1" value={form.dailyDemand} onChange={e=>setForm({...form,dailyDemand:e.target.value})}/></label><label>Stock Added Date<input type="date" required value={form.stockAddedDate} disabled={Boolean(editing)} onChange={e=>setForm({...form,stockAddedDate:e.target.value})}/><small>{editing?'Original opening-stock date is preserved.':'The initial quantity is recorded on this exact date.'}</small></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowForm(false)}>Cancel</button><button type="submit" className="primary-btn">{editing?'Save changes':'Add product'}</button></div></form></div>}
  </div>
}

function PageTitle({eyebrow,title,description,action}){return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>}
function PanelHead({kicker,title,right}){return <div className="panel-head"><div><span className="panel-kicker">{kicker}</span><h2>{title}</h2></div>{right}</div>}
function Kpi({icon:Icon,label,value,detail,color}){return <div className="kpi-card"><div className="kpi-head"><span>{label}</span><i className={color}><Icon size={18}/></i></div><b className="kpi-value">{value}</b><small>{detail}</small></div>}
function Status({value}){const cls=value==='Critical'||value==='Out of Stock'||value==='Full'?'critical':value==='Watch'||value==='Low Stock'||value==='No historical data'||value==='Partial from Nov 23'||value==='Partially occupied'?'watch':value==='Empty'?'empty':'healthy';return <span className={`status ${cls}`}><i/>{value}</span>}
function Empty({text}){return <div className="empty-state"><Package size={22}/><span>{text}</span></div>}
function Module({icon:Icon,title,text}){return <div className="module-card"><span><Icon size={18}/></span><div><b>{title}</b><small>{text}</small></div><CheckCircle2 size={16} className="module-check"/></div>}
export default App
