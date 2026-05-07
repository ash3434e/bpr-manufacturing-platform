// Demand Forecasting Algorithms

/**
 * Simple Moving Average
 * Calculates the average of the last N data points
 */
function movingAverage(data, windowSize = 7) {
  if (data.length === 0) return [];
  const window = Math.min(windowSize, data.length);
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // Not enough data points yet, use available average
      const slice = data.slice(0, i + 1);
      const avg = slice.reduce((sum, d) => sum + d.quantity, 0) / slice.length;
      result.push({ date: data[i].date, actual: data[i].quantity, forecast: Math.round(avg * 100) / 100 });
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((sum, d) => sum + d.quantity, 0) / window;
      result.push({ date: data[i].date, actual: data[i].quantity, forecast: Math.round(avg * 100) / 100 });
    }
  }

  // Project future values (next 30 days)
  const lastWindow = data.slice(-window);
  const lastAvg = lastWindow.reduce((sum, d) => sum + d.quantity, 0) / window;
  const lastDate = new Date(data[data.length - 1].date);

  for (let i = 1; i <= 30; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    result.push({
      date: futureDate.toISOString().split('T')[0],
      actual: null,
      forecast: Math.round(lastAvg * 100) / 100
    });
  }

  return result;
}

/**
 * Simple Linear Regression
 * y = mx + b
 */
function linearRegression(data) {
  if (data.length < 2) return [];

  const n = data.length;
  const xValues = data.map((_, i) => i);
  const yValues = data.map(d => d.quantity);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const result = data.map((d, i) => ({
    date: d.date,
    actual: d.quantity,
    forecast: Math.round((slope * i + intercept) * 100) / 100
  }));

  // Project future values
  const lastDate = new Date(data[data.length - 1].date);
  for (let i = 1; i <= 30; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    const predicted = slope * (n - 1 + i) + intercept;
    result.push({
      date: futureDate.toISOString().split('T')[0],
      actual: null,
      forecast: Math.max(0, Math.round(predicted * 100) / 100)
    });
  }

  return result;
}

/**
 * Weighted Moving Average - gives more weight to recent data
 */
function weightedMovingAverage(data, windowSize = 7) {
  if (data.length === 0) return [];
  const window = Math.min(windowSize, data.length);
  const result = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const totalWeight = slice.reduce((sum, _, j) => sum + (j + 1), 0);
    const weightedSum = slice.reduce((sum, d, j) => sum + d.quantity * (j + 1), 0);
    result.push({
      date: data[i].date,
      actual: data[i].quantity,
      forecast: Math.round((weightedSum / totalWeight) * 100) / 100
    });
  }

  // Project future
  const lastSlice = data.slice(-window);
  const totalW = lastSlice.reduce((sum, _, j) => sum + (j + 1), 0);
  const wAvg = lastSlice.reduce((sum, d, j) => sum + d.quantity * (j + 1), 0) / totalW;
  const lastDate = new Date(data[data.length - 1].date);

  for (let i = 1; i <= 30; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    result.push({
      date: futureDate.toISOString().split('T')[0],
      actual: null,
      forecast: Math.round(wAvg * 100) / 100
    });
  }

  return result;
}

/**
 * What-If Simulation Engine
 * Simulates impact of various scenarios on BPR and inventory
 */
function whatIfSimulation(currentState, scenario) {
  const result = { ...currentState };

  if (scenario.demandIncreasePct) {
    result.daily_consumption *= (1 + scenario.demandIncreasePct / 100);
    result.reserved_demand = Math.round(result.reserved_demand * (1 + scenario.demandIncreasePct / 100));
  }

  if (scenario.supplierDelayDays) {
    result.incoming_orders = Math.max(0, result.incoming_orders - Math.round(result.daily_consumption * scenario.supplierDelayDays));
  }

  if (scenario.machineFailure) {
    result.daily_consumption *= 0.7; // 30% reduction in production capacity
    result.on_hand = Math.max(0, result.on_hand - Math.round(result.daily_consumption * 3));
  }

  if (scenario.demandDecreasePct) {
    result.daily_consumption *= (1 - scenario.demandDecreasePct / 100);
    result.reserved_demand = Math.round(result.reserved_demand * (1 - scenario.demandDecreasePct / 100));
  }

  // Recalculate BPR
  const available = Math.max(0, result.on_hand + result.incoming_orders - result.reserved_demand);
  const consumption = Math.max(0, Math.min(result.buffer_size, result.buffer_size - available));
  const bpr = result.buffer_size > 0 ? (consumption / result.buffer_size) * 100 : 100;
  const daysOfStock = result.daily_consumption > 0 ? Math.round(available / result.daily_consumption) : Infinity;

  return {
    ...result,
    simulated_bpr: Math.min(100, Math.max(0, Math.round(bpr * 100) / 100)),
    simulated_available: available,
    simulated_days_of_stock: daysOfStock,
    simulated_zone: bpr <= 33 ? 'green' : bpr <= 66 ? 'yellow' : 'red'
  };
}

module.exports = {
  movingAverage,
  linearRegression,
  weightedMovingAverage,
  whatIfSimulation
};
