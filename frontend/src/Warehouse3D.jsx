import React, { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, Text } from '@react-three/drei'

const occupancyColor = (quantity, capacity) => {
  if (!Number.isFinite(capacity) || capacity <= 0) return '#6a7b8d'
  if (quantity <= 0) return '#64788a'
  if (quantity >= capacity) return '#df6265'
  return '#e1a34b'
}

function StockUnit({ allocation, index, count, isLowStock }) {
  const width = Math.max(0.24, Math.min(0.72, 2.12 / Math.max(count, 1)))
  const x = (index - (count - 1) / 2) * (width + 0.04)
  const hue = Array.from(String(allocation.sku || allocation.productId)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
  const color = `hsl(${hue} 40% 48%)`

  return (
    <group position={[x, 0.23, 0]}>
      <mesh castShadow>
        <boxGeometry args={[width, 0.42, 0.56]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={isLowStock ? '#f59e0b' : '#000000'} emissiveIntensity={isLowStock ? 0.18 : 0} />
      </mesh>
      <mesh position={[0, 0.213, 0]}>
        <boxGeometry args={[Math.max(0.04, width * 0.12), 0.008, 0.57]} />
        <meshStandardMaterial color={isLowStock ? '#fbbf24' : '#e6d1ad'} />
      </mesh>
      {isLowStock && <mesh position={[0, 0.45, 0.29]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>}
      {count <= 4 && <Text position={[0, 0.46, 0.04]} fontSize={0.085} color="white" anchorX="center" anchorY="middle">
        {allocation.quantity}
      </Text>}
    </group>
  )
}

function ShelfUnit({ shelf, allocations, y, selected, onSelect, productsById }) {
  const [hovered, setHovered] = useState(false)
  const quantity = allocations.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0)
  const capacity = Number(shelf.maxCapacity)
  const color = occupancyColor(quantity, capacity)
  const status = !Number.isFinite(capacity) || capacity <= 0
    ? 'Capacity unavailable'
    : quantity <= 0 ? 'Empty' : quantity >= capacity ? 'Full' : 'Partially occupied'
  const isLowStock = allocation => {
    const product = productsById[String(allocation.productId)]
    return Boolean(product && Number(product.quantity) <= Number(product.reorderLevel))
  }

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.16, 0]} receiveShadow onClick={event => { event.stopPropagation(); onSelect(shelf.id) }}
        onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}>
        <boxGeometry args={[2.68, 0.12, 1.04]} />
        <meshStandardMaterial color={selected ? '#399fe5' : '#29445e'} metalness={0.38} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.065, 0.54]}>
        <boxGeometry args={[2.65, 0.045, 0.055]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.28 : 0.1} />
      </mesh>
      {allocations.map((allocation, index) => <StockUnit key={allocation.productId} allocation={allocation} index={index} count={allocations.length} isLowStock={isLowStock(allocation)} />)}
      <mesh position={[0, -0.015, 0.61]} onClick={event => { event.stopPropagation(); onSelect(shelf.id) }}
        onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}>
        <boxGeometry args={[0.95, 0.12, 0.035]} />
        <meshBasicMaterial color={selected ? '#1f8de0' : '#142538'} />
      </mesh>
      <Text position={[0, -0.012, 0.64]} fontSize={0.09} color="white" anchorX="center" anchorY="middle">
        {`${shelf.code} · ${quantity}/${Number.isFinite(capacity) ? capacity : '—'}`}
      </Text>
      {(hovered || selected) && <Html position={[0, 0.58, 0.58]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="warehouse-3d-tooltip">
          <b>{shelf.code} · {status}</b>
          <span>{quantity} of {Number.isFinite(capacity) ? capacity : 'unknown'} units</span>
          {allocations.length ? allocations.map(allocation => <small key={allocation.productId}>
            {allocation.productName} ({allocation.sku}) · {allocation.quantity} units{isLowStock(allocation) ? ' · Low stock' : ''}
          </small>) : <small>No products allocated</small>}
        </div>
      </Html>}
    </group>
  )
}

function RackModel({ rack, shelves, inventoryByShelf, position, selectedRack, selectedShelfId, onSelectRack, onSelectShelf, productsById }) {
  const sortedShelves = [...shelves].sort((a, b) => String(a.code).localeCompare(String(b.code)))
  const height = 3.9
  const selected = String(selectedRack) === String(rack.id)
  const shelfY = index => sortedShelves.length <= 1 ? 0.45 : 0.45 + (index / (sortedShelves.length - 1)) * 2.7

  return (
    <group position={position}>
      {[-1.42, 1.42].map(x => <mesh key={x} position={[x, height / 2, 0]} castShadow
        onClick={event => { event.stopPropagation(); onSelectRack(rack.id) }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <boxGeometry args={[0.13, height, 0.14]} />
        <meshStandardMaterial color={selected ? '#4ba9ed' : '#3676a8'} metalness={0.6} roughness={0.38} />
      </mesh>)}
      {[0.16, height - 0.14].map(y => <mesh key={y} position={[0, y, 0]}>
        <boxGeometry args={[2.98, 0.08, 0.16]} />
        <meshStandardMaterial color="#7193aa" metalness={0.55} />
      </mesh>)}
      {sortedShelves.map((shelf, index) => <ShelfUnit key={shelf.id} shelf={shelf}
        allocations={inventoryByShelf[String(shelf.id)] || []} y={shelfY(index)}
        selected={String(selectedShelfId) === String(shelf.id)}
        onSelect={shelfId => onSelectShelf(rack.id, shelfId)} productsById={productsById} />)}
      <mesh position={[0, height + 0.22, 0.08]} onClick={event => { event.stopPropagation(); onSelectRack(rack.id) }}>
        <boxGeometry args={[2.4, 0.34, 0.12]} />
        <meshStandardMaterial color={selected ? '#197dc2' : '#172b3e'} emissive={selected ? '#125487' : '#000000'} />
      </mesh>
      <Text position={[0, height + 0.22, 0.16]} fontSize={0.16} color="white" anchorX="center" anchorY="middle">
        {`${rack.code} · ${rack.name}`}
      </Text>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[3.2, 0.06, 1.28]} />
        <meshStandardMaterial color={selected ? '#277fba' : '#1c2f42'} metalness={0.2} roughness={0.7} />
      </mesh>
    </group>
  )
}

function WarehouseScene({ racks, shelves, inventoryByShelf, selectedRackId, selectedShelfId, onSelectRack, onSelectShelf, cameraView, productsById }) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(racks.length)))
  const rows = Math.max(1, Math.ceil(racks.length / columns))
  const spacingX = 4.9
  const spacingZ = 4.5
  const floorWidth = Math.max(12, columns * spacingX + 3)
  const floorDepth = Math.max(10, rows * spacingZ + 3)
  const cameraDistance = Math.max(11, columns * 3.6, rows * 3.6)
  const rackPositions = useMemo(() => racks.map((_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return [
      (column - (columns - 1) / 2) * spacingX,
      0,
      (row - (rows - 1) / 2) * spacingZ,
    ]
  }), [racks, columns, rows])

  return <>
    <color attach="background" args={['#0b1522']} />
    <fog attach="fog" args={['#0b1522', 20, 48]} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[6, 12, 8]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <pointLight position={[-6, 6, -3]} color="#3d9eea" intensity={15} distance={20} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[floorWidth, floorDepth]} />
      <meshStandardMaterial color="#172536" roughness={0.88} />
    </mesh>
    {Array.from({ length: columns + 1 }, (_, i) => {
      const x = (i - columns / 2) * spacingX
      return <mesh key={`line-x-${i}`} position={[x, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.025, floorDepth - 1]} /><meshBasicMaterial color="#456078" transparent opacity={0.42} />
      </mesh>
    })}
    {Array.from({ length: rows + 1 }, (_, i) => {
      const z = (i - rows / 2) * spacingZ
      return <mesh key={`line-z-${i}`} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth - 1, 0.025]} /><meshBasicMaterial color="#456078" transparent opacity={0.42} />
      </mesh>
    })}
    {racks.map((rack, index) => <RackModel key={rack.id} rack={rack}
      shelves={shelves.filter(shelf => String(shelf.rackId) === String(rack.id))}
      inventoryByShelf={inventoryByShelf} position={rackPositions[index]}
      selectedRack={selectedRackId} selectedShelfId={selectedShelfId}
      onSelectRack={onSelectRack} onSelectShelf={onSelectShelf} productsById={productsById} />)}
    <ContactShadows position={[0, 0.012, 0]} opacity={0.42} scale={Math.max(floorWidth, floorDepth)} blur={2.4} />
    <OrbitControls makeDefault minDistance={6} maxDistance={cameraDistance * 1.7}
      maxPolarAngle={Math.PI / 2.04} target={[0, 1.2, 0]} enableDamping dampingFactor={0.08} />
    {cameraView === 'top' && <directionalLight position={[0, 16, 0]} intensity={0.4} />}
  </>
}

export default function Warehouse3D({
  racks = [], shelves = [], inventoryByShelf = {}, selectedRackId, selectedShelfId,
  onSelectRack, onSelectShelf, loading = false, products = [],
}) {
  const [cameraView, setCameraView] = useState('overview')
  const cols = Math.max(1, Math.ceil(Math.sqrt(racks.length)))
  const rows = Math.max(1, Math.ceil(racks.length / cols))
  const distance = Math.max(11, cols * 3.6, rows * 3.6)
  const productsById = useMemo(() => Object.fromEntries(products.map(product => [String(product.id), product])), [products])

  return <div className="sw-3d-warehouse">
    <div className="sw-3d-toolbar">
      <div>
        <span className="sw-3d-eyebrow">LIVE DATABASE INVENTORY</span>
        <h3>Warehouse Digital Twin</h3>
        <p>Click a rack or shelf to inspect its recorded product allocations.</p>
      </div>
      <div className="sw-3d-controls">
        <button className={cameraView === 'overview' ? 'active' : ''} onClick={() => setCameraView('overview')}>Overview</button>
        <button className={cameraView === 'top' ? 'active' : ''} onClick={() => setCameraView('top')}>Top View</button>
        <span>Drag to rotate · Scroll to zoom</span>
      </div>
    </div>
    <div className="sw-3d-canvas">
      {loading&&<div className="sw-3d-refreshing">Refreshing live rack and shelf data…</div>}
      <Canvas shadows dpr={[1, 1.7]} camera={{
        position: cameraView === 'top' ? [0, distance * 1.25, 0.1] : [distance, Math.max(8, distance * 0.78), distance],
        fov: 42,
      }}>
        <WarehouseScene racks={racks} shelves={shelves} inventoryByShelf={inventoryByShelf}
          selectedRackId={selectedRackId} selectedShelfId={selectedShelfId}
          onSelectRack={onSelectRack} onSelectShelf={onSelectShelf} cameraView={cameraView} productsById={productsById}/>
      </Canvas>
    </div>
    <div className="sw-3d-legend">
      <span><i className="empty"/> Empty shelf</span>
      <span><i className="partial"/> Partially occupied</span>
      <span><i className="full"/> Full shelf</span>
      <span><i className="low-stock"/> Low-stock product</span>
      <span className="sw-3d-note">Crates represent allocated product records; quantities come from shelf inventory.</span>
    </div>
  </div>
}
