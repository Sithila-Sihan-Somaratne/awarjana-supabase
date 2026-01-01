/**
 * Material prices/constants in LKR based on industry standards in Sri Lanka
 */
export const MATERIAL_PRICES = {
  GLASS_PER_SQ_INCH: 1350.0 / (48 * 36), 
  MDF_PER_SQ_INCH: 1380.0 / (96 * 48),
  FIXED_SUPPLIES: 50.0 + 10.0 + 20.0 + 10.0, 
  LABOR_BASE: 100.0 + 50.0, 
};

/**
 * Calculates the base manufacturing cost
 */
export const calculateOrderCost = (width, height, mouldingPricePerInch = 15.0) => {
  if (!width || !height || width <= 0 || height <= 0) {
    return { total: 0, breakdown: { frame: 0, glass: 0, mdf: 0, labor: 0 } };
  }
  const w = parseFloat(width);
  const h = parseFloat(height);
  const area = w * h;
  const perimeter = (w + h) * 2;
  
  const frameCost = perimeter * parseFloat(mouldingPricePerInch);
  const glassCost = area * MATERIAL_PRICES.GLASS_PER_SQ_INCH;
  const mdfCost = area * MATERIAL_PRICES.MDF_PER_SQ_INCH;
  const fixedTotal = MATERIAL_PRICES.FIXED_SUPPLIES + MATERIAL_PRICES.LABOR_BASE;
  
  const total = frameCost + glassCost + mdfCost + fixedTotal;

  return {
    total: Math.ceil(total),
    breakdown: {
      frame: Math.round(frameCost),
      glass: Math.round(glassCost),
      mdf: Math.round(mdfCost),
      labor: Math.round(fixedTotal),
    },
    specs: { perimeter, area }
  };
};

export const formatLKR = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency', 
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount).replace('LKR', 'Rs.');
};

export const getDeadlineOptions = () => [
  { id: 'standard', label: 'Standard (7-10 days)', multiplier: 1.0 },
  { id: 'express', label: 'Express (3-5 days)', multiplier: 1.5 },
  { id: 'custom', label: 'Custom Date', multiplier: 1.25 },
];

export const getPriorityOptions = () => [
  { id: 'minor', label: 'Minor', multiplier: 0.90 },
  { id: 'medium', label: 'Medium', multiplier: 1.0 },
  { id: 'high', label: 'High', multiplier: 1.25 },
  { id: 'urgent', label: 'Urgent', multiplier: 1.50 },
];

export const calculateFinalTotal = (baseCost, deadlineType, priorityType) => {
  const dOpt = getDeadlineOptions().find(o => o.id === deadlineType) || { multiplier: 1 };
  const pOpt = getPriorityOptions().find(o => o.id === priorityType) || { multiplier: 1 };
  const combinedMultiplier = dOpt.multiplier * pOpt.multiplier;
  
  return { 
    totalCost: Math.round(baseCost * combinedMultiplier), 
    multiplier: combinedMultiplier.toFixed(2),
    isDiscounted: pOpt.multiplier < 1 
  };
};