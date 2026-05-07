// BPR Core Calculation Engine

/**
 * Calculate Buffer Penetration Ratio
 * BPR = (Current Buffer Consumption / Total Buffer Size) × 100
 */
function calculateBPR(consumption, bufferSize) {
  if (bufferSize <= 0) return 100;
  const bpr = (consumption / bufferSize) * 100;
  return Math.min(100, Math.max(0, Math.round(bpr * 100) / 100));
}

/**
 * Classify BPR into zones
 * Green: 0–33% → Safe
 * Yellow: 34–66% → Watch carefully
 * Red: 67–100% → Immediate action required
 */
function classifyZone(bpr) {
  if (bpr <= 33) return { zone: 'green', label: 'Safe', priority: 0 };
  if (bpr <= 66) return { zone: 'yellow', label: 'Watch', priority: 1 };
  return { zone: 'red', label: 'Critical', priority: 2 };
}

/**
 * Calculate Available Stock
 * Available Stock = On Hand + Incoming Orders − Reserved Demand
 */
function calculateAvailableStock(onHand, incomingOrders, reservedDemand) {
  return Math.max(0, onHand + incomingOrders - reservedDemand);
}

/**
 * Calculate buffer consumption from inventory data
 * Consumption = Buffer Size - Available Stock (clamped to 0..bufferSize)
 */
function calculateBufferConsumption(inventory) {
  const available = calculateAvailableStock(
    inventory.on_hand,
    inventory.incoming_orders,
    inventory.reserved_demand
  );
  return Math.max(0, Math.min(inventory.buffer_size, inventory.buffer_size - available));
}

/**
 * Calculate Supplier Risk Score
 * Risk = (Delayed Deliveries / Total Deliveries) × 100
 */
function calculateSupplierRisk(delayedDeliveries, totalDeliveries) {
  if (totalDeliveries <= 0) return 0;
  return Math.round((delayedDeliveries / totalDeliveries) * 100 * 100) / 100;
}

/**
 * Calculate recommended Safety Stock
 * Safety Stock = Average Daily Demand × Lead Time Variability
 */
function calculateSafetyStock(avgDailyDemand, leadTimeVariability) {
  return Math.ceil(avgDailyDemand * leadTimeVariability);
}

/**
 * Get full BPR analysis for an inventory item
 */
function analyzeBPR(inventory) {
  const consumption = calculateBufferConsumption(inventory);
  const bpr = calculateBPR(consumption, inventory.buffer_size);
  const zone = classifyZone(bpr);
  const availableStock = calculateAvailableStock(
    inventory.on_hand,
    inventory.incoming_orders,
    inventory.reserved_demand
  );
  const daysOfStock = inventory.daily_consumption > 0
    ? Math.round(availableStock / inventory.daily_consumption)
    : Infinity;

  return {
    bpr,
    ...zone,
    consumption,
    availableStock,
    daysOfStock,
    needsReorder: availableStock <= inventory.reorder_level,
    belowSafetyStock: availableStock <= inventory.safety_stock
  };
}

/**
 * Detect machine bottlenecks
 * A machine is a bottleneck if utilization > threshold (default 85%)
 */
function detectBottleneck(machine, threshold = 85) {
  const utilization = machine.capacity_per_hour > 0
    ? (machine.current_load / machine.capacity_per_hour) * 100
    : 0;
  return {
    isBottleneck: utilization > threshold,
    utilization: Math.round(utilization * 100) / 100,
    severity: utilization > 95 ? 'critical' : utilization > threshold ? 'warning' : 'normal'
  };
}

module.exports = {
  calculateBPR,
  classifyZone,
  calculateAvailableStock,
  calculateBufferConsumption,
  calculateSupplierRisk,
  calculateSafetyStock,
  analyzeBPR,
  detectBottleneck
};
