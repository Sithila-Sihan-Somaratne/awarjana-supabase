// Material prices/constants in LKR based on cost.xlsx
export const MATERIAL_PRICES = {
  GLASS_PER_SQ_INCH: 1350.0 / (48 * 36), 
  MDF_PER_SQ_INCH: 1380.0 / (96 * 48),
  FIXED_SUPPLIES: 50.0 + 10.0 + 20.0 + 10.0, // Stand (50) + Hook (10) + Under Pin (20) + Side Pin (10)
  LABOR_BASE: 100.0 + 50.0,    // Wages (100) + Electricity (50)
};

export const calculateOrderCost = (width, height, frameBasePrice = 518.52) => {
  if (!width || !height || width <= 0 || height <= 0) {
    return { total: 0, breakdown: { frame: 0, glass: 0, mdf: 0, labor: 0 } };
  }

  const area = width * height;
  const frameCost = parseFloat(frameBasePrice);
  const glassCost = area * MATERIAL_PRICES.GLASS_PER_SQ_INCH;
  const mdfCost = area * MATERIAL_PRICES.MDF_PER_SQ_INCH;
  
  const total = frameCost + glassCost + mdfCost + MATERIAL_PRICES.FIXED_SUPPLIES + MATERIAL_PRICES.LABOR_BASE;

  return {
    total: Math.ceil(total),
    breakdown: {
      frame: Math.round(frameCost),
      glass: Math.round(glassCost),
      mdf: Math.round(mdfCost),
      labor: Math.round(MATERIAL_PRICES.LABOR_BASE + MATERIAL_PRICES.FIXED_SUPPLIES),
    }
  };
};

export const formatLKR = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency', currency: 'LKR',
  }).format(amount).replace('LKR', 'Rs.');
};

export const getDeadlineOptions = () => [
  { id: 'standard', label: 'Standard (7-10 days)', multiplier: 1.0 },
  { id: 'express', label: 'Express (3-5 days)', multiplier: 1.5 },
  { id: 'custom', label: 'Custom Date', multiplier: 1.25 },
];

export const calculateWithDeadline = (baseCost, deadlineType) => {
  const options = getDeadlineOptions();
  const option = options.find(o => o.id === deadlineType) || options[0];
  return { totalCost: Math.round(baseCost * option.multiplier), multiplier: option.multiplier };
};
