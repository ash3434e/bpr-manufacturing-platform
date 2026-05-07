// Auto-Scheduling Engine
// When an order is received, auto-schedules production based on:
// - Process steps with durations
// - Machine availability
// - Buffer days between processes
// - Generates Green/Yellow/Red schedulability indicators

const { dbAll, dbGet, dbRun } = require('../db/init');

// Default process templates per product category
const PROCESS_TEMPLATES = {
  'Assemblies': [
    { name: 'Raw Material Prep', duration_hours: 8, machine_type: 'CNC' },
    { name: 'Machining', duration_hours: 8, machine_type: 'CNC' },
    { name: 'Assembly', duration_hours: 8, machine_type: 'Assembly' },
    { name: 'Quality Check', duration_hours: 4, machine_type: 'Inspection' },
    { name: 'Finishing', duration_hours: 4, machine_type: 'Pressing' },
  ],
  'Components': [
    { name: 'Material Cutting', duration_hours: 6, machine_type: 'CNC' },
    { name: 'Shaping', duration_hours: 8, machine_type: 'Milling' },
    { name: 'Surface Treatment', duration_hours: 4, machine_type: 'Painting' },
    { name: 'Quality Check', duration_hours: 4, machine_type: 'Inspection' },
  ],
  'Electronics': [
    { name: 'PCB Assembly', duration_hours: 6, machine_type: 'Assembly' },
    { name: 'Soldering', duration_hours: 4, machine_type: 'Welding' },
    { name: 'Programming', duration_hours: 4, machine_type: 'Assembly' },
    { name: 'Testing', duration_hours: 6, machine_type: 'Inspection' },
    { name: 'Packaging', duration_hours: 2, machine_type: 'Assembly' },
  ],
  'default': [
    { name: 'Processing Step 1', duration_hours: 8, machine_type: 'CNC' },
    { name: 'Processing Step 2', duration_hours: 8, machine_type: 'Assembly' },
    { name: 'Quality Check', duration_hours: 4, machine_type: 'Inspection' },
  ]
};

/**
 * Auto-schedule an order
 * @param {number} orderId - The order to schedule
 * @param {number} bufferDays - Buffer days between processes (default 1)
 * @returns {object} Schedule with Green/Yellow/Red status
 */
function autoScheduleOrder(orderId, bufferDays = 1) {
  const order = dbGet(`
    SELECT o.*, p.name as product_name, p.category, p.plant_id
    FROM orders o JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `, [orderId]);

  if (!order) throw new Error('Order not found');

  const processes = PROCESS_TEMPLATES[order.category] || PROCESS_TEMPLATES['default'];
  const plantMachines = dbAll('SELECT * FROM machines WHERE plant_id = ? AND status != ?', [order.plant_id, 'breakdown']);

  const startDate = new Date(order.order_date);
  const dueDate = order.due_date ? new Date(order.due_date) : null;
  const schedule = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < processes.length; i++) {
    const process = processes[i];

    // Find available machine of matching type
    const availableMachines = plantMachines.filter(m =>
      m.type && m.type.toLowerCase() === process.machine_type.toLowerCase()
    );
    const bestMachine = availableMachines.length > 0
      ? availableMachines.sort((a, b) => a.utilization_pct - b.utilization_pct)[0]
      : plantMachines[0]; // fallback to any machine

    const processDays = Math.ceil(process.duration_hours / 8); // 8-hour workday
    const processEnd = new Date(currentDate);
    processEnd.setDate(processEnd.getDate() + processDays);

    schedule.push({
      step: i + 1,
      process_name: process.name,
      duration_hours: process.duration_hours,
      duration_days: processDays,
      machine_type: process.machine_type,
      assigned_machine: bestMachine ? bestMachine.name : 'Unassigned',
      machine_id: bestMachine ? bestMachine.id : null,
      machine_utilization: bestMachine ? bestMachine.utilization_pct : 0,
      start_date: currentDate.toISOString().split('T')[0],
      end_date: processEnd.toISOString().split('T')[0],
      buffer_after: i < processes.length - 1 ? bufferDays : 0
    });

    // Move to next process start (add buffer)
    currentDate = new Date(processEnd);
    if (i < processes.length - 1) {
      currentDate.setDate(currentDate.getDate() + bufferDays);
    }
  }

  // Calculate completion date and schedulability
  const totalDays = schedule.reduce((sum, s) => sum + s.duration_days + s.buffer_after, 0);
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + totalDays);

  let schedulability = 'green';
  let schedulabilityLabel = 'On Track';
  let daysSlack = null;

  if (dueDate) {
    daysSlack = Math.floor((dueDate - completionDate) / (1000 * 60 * 60 * 24));
    if (daysSlack < 0) {
      schedulability = 'red';
      schedulabilityLabel = `Delayed by ${Math.abs(daysSlack)} days`;
    } else if (daysSlack <= 2) {
      schedulability = 'yellow';
      schedulabilityLabel = `Tight (${daysSlack} day${daysSlack !== 1 ? 's' : ''} slack)`;
    } else {
      schedulability = 'green';
      schedulabilityLabel = `On Track (${daysSlack} days slack)`;
    }
  }

  // Check machine bottleneck risks
  const bottleneckRisk = schedule.some(s => s.machine_utilization > 90);
  if (bottleneckRisk && schedulability !== 'red') {
    schedulability = schedulability === 'green' ? 'yellow' : schedulability;
    schedulabilityLabel += ' — Machine bottleneck risk';
  }

  return {
    order_id: orderId,
    product_name: order.product_name,
    category: order.category,
    quantity: order.quantity,
    order_date: order.order_date,
    due_date: order.due_date,
    completion_date: completionDate.toISOString().split('T')[0],
    total_days: totalDays,
    total_processes: processes.length,
    buffer_days_per_step: bufferDays,
    schedulability,
    schedulability_label: schedulabilityLabel,
    days_slack: daysSlack,
    bottleneck_risk: bottleneckRisk,
    schedule
  };
}

/**
 * Schedule all pending/confirmed orders
 */
function scheduleAllOrders(bufferDays = 1) {
  const orders = dbAll(`
    SELECT o.id FROM orders o
    WHERE o.status IN ('pending', 'confirmed', 'shipped')
    ORDER BY o.due_date ASC NULLS LAST
  `);

  return orders.map(o => {
    try {
      return autoScheduleOrder(o.id, bufferDays);
    } catch (e) {
      return { order_id: o.id, error: e.message };
    }
  });
}

module.exports = { autoScheduleOrder, scheduleAllOrders, PROCESS_TEMPLATES };
