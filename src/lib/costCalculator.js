/**
 * Cost Calculator for Awarjana Frames
 * Based on cost.xlsx logic
 */

export const MATERIAL_PRICES = {
  FRAME_BASE: 700.0, // Base cost for frame
  GLASS_PER_SQ_INCH: 1350.0 / (48 * 36), // 1350 for 48x36 sheet
  MDF_PER_SQ_INCH: 1380.0 / (96 * 48), // 1380 for 96x48 sheet
  STAND: 50.0,
  HOOK: 10.0,
  UNDER_PIN: 20.0,
  SIDE_PIN: 10.0,
  WAGES: 100.0,
  ELECTRICITY: 50.0
};

export const calculateOrderCost = (width, height) => {
  const area = width * height;
  
  const frameCost = MATERIAL_PRICES.FRAME_BASE; // Simplified base cost as per sheet
  const glassCost = area * MATERIAL_PRICES.GLASS_PER_SQ_INCH;
  const mdfCost = area * MATERIAL_PRICES.MDF_PER_SQ_INCH;
  
  const totalCost = 
    frameCost + 
    glassCost + 
    mdfCost + 
    MATERIAL_PRICES.STAND + 
    MATERIAL_PRICES.HOOK + 
    MATERIAL_PRICES.UNDER_PIN + 
    MATERIAL_PRICES.SIDE_PIN + 
    MATERIAL_PRICES.WAGES + 
    MATERIAL_PRICES.ELECTRICITY;

  return {
    total: Math.ceil(totalCost),
    breakdown: {
      frame: frameCost,
      glass: glassCost,
      mdf: mdfCost,
      others: MATERIAL_PRICES.STAND + MATERIAL_PRICES.HOOK + MATERIAL_PRICES.UNDER_PIN + MATERIAL_PRICES.SIDE_PIN,
      labor: MATERIAL_PRICES.WAGES + MATERIAL_PRICES.ELECTRICITY
    }
  };
};

export const formatLKR = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount).replace('LKR', 'Rs.');
};
