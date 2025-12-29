/**
 * Cost Calculator for Awarjana Frames
 * Based on cost.xlsx logic with LKR currency
 */

// Material prices in LKR
export const MATERIAL_PRICES = {
  FRAME_BASE: 700.0, // Base cost for frame
  GLASS_PER_SQ_INCH: 1350.0 / (48 * 36), // 1350 for 48x36 sheet
  MDF_PER_SQ_INCH: 1380.0 / (96 * 48), // 1380 for 96x48 sheet
  STAND: 50.0,
  HOOK: 10.0,
  UNDER_PIN: 20.0,
  SIDE_PIN: 10.0,
  WAGES: 100.0,
  ELECTRICITY: 50.0,
};

// Credit consumption rates
export const CREDIT_CONSUMPTION = {
  ORDER_CREATE: 0.10,  // 1 credit per 10 orders
  ORDER_UPDATE: 0.05,  // 1 credit per 20 updates
  DRAFT_SUBMIT: 0.05,  // 1 credit per 20 drafts
};

/**
 * Calculate order cost based on dimensions
 * @param {number} width - Width in inches
 * @param {number} height - Height in inches
 * @returns {object} - Cost breakdown
 */
export const calculateOrderCost = (width, height) => {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      total: 0,
      breakdown: {
        frame: 0,
        glass: 0,
        mdf: 0,
        others: 0,
        labor: 0,
      },
      error: 'Invalid dimensions',
    };
  }

  const area = width * height;
  
  const frameCost = MATERIAL_PRICES.FRAME_BASE;
  const glassCost = area * MATERIAL_PRICES.GLASS_PER_SQ_INCH;
  const mdfCost = area * MATERIAL_PRICES.MDF_PER_SQ_INCH;
  const othersCost = MATERIAL_PRICES.STAND + MATERIAL_PRICES.HOOK + MATERIAL_PRICES.UNDER_PIN + MATERIAL_PRICES.SIDE_PIN;
  const laborCost = MATERIAL_PRICES.WAGES + MATERIAL_PRICES.ELECTRICITY;

  const totalCost = frameCost + glassCost + mdfCost + othersCost + laborCost;

  return {
    total: Math.ceil(totalCost),
    breakdown: {
      frame: Math.round(frameCost * 100) / 100,
      glass: Math.round(glassCost * 100) / 100,
      mdf: Math.round(mdfCost * 100) / 100,
      others: Math.round(othersCost * 100) / 100,
      labor: Math.round(laborCost * 100) / 100,
    },
    dimensions: { width, height, area },
    creditsRequired: CREDIT_CONSUMPTION.ORDER_CREATE,
  };
};

/**
 * Calculate order cost for multiple sizes (if using height2/width2)
 * @param {object} dimensions - Object with width, height, width2, height2
 * @returns {object} - Cost breakdown for combined dimensions
 */
export const calculateMultiSizeCost = (dimensions) => {
  const { width, height, width2, height2 } = dimensions;
  
  // Calculate cost for primary size
  const primaryCost = calculateOrderCost(width, height);
  
  // If secondary dimensions are provided, add them
  let secondaryCost = null;
  if (width2 && height2 && width2 > 0 && height2 > 0) {
    secondaryCost = calculateOrderCost(width2, height2);
  }

  const totalCost = primaryCost.total + (secondaryCost?.total || 0);
  const totalCredits = primaryCost.creditsRequired + (secondaryCost?.creditsRequired || 0);

  return {
    total: totalCost,
    primaryBreakdown: primaryCost.breakdown,
    secondaryBreakdown: secondaryCost?.breakdown || null,
    creditsRequired: Math.round(totalCredits * 100) / 100,
    hasSecondarySize: !!secondaryCost,
  };
};

/**
 * Format currency in LKR (Sri Lankan Rupees)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatLKR = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rs. 0.00';
  }
  
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('LKR', 'Rs.');
};

/**
 * Get deadline options with pricing
 * @returns {array} - Deadline options
 */
export const getDeadlineOptions = () => {
  return [
    {
      id: 'standard',
      label: 'Standard (7-10 days)',
      multiplier: 1.0,
      description: 'Regular production timeline',
    },
    {
      id: 'express',
      label: 'Express (3-5 days)',
      multiplier: 1.5,
      description: 'Faster production for urgent orders (+50%)',
    },
    {
      id: 'custom',
      label: 'Custom Date',
      multiplier: 1.25,
      description: 'Specific deadline (+25%)',
    },
  ];
};

/**
 * Calculate total with deadline multiplier
 * @param {number} baseCost - Base cost
 * @param {string} deadlineType - Deadline type
 * @returns {object} - Calculated cost and multiplier
 */
export const calculateWithDeadline = (baseCost, deadlineType) => {
  const options = getDeadlineOptions();
  const option = options.find(o => o.id === deadlineType) || options[0];
  
  const totalCost = Math.round(baseCost * option.multiplier * 100) / 100;
  const extraCost = totalCost - baseCost;

  return {
    baseCost,
    multiplier: option.multiplier,
    extraCost,
    totalCost,
    deadlineType: option,
  };
};

/**
 * Estimate material requirements based on order size
 * @param {number} width - Width in inches
 * @param {number} height - Height in inches
 * @returns {object} - Material estimates
 */
export const estimateMaterials = (width, height) => {
  const area = width * height;
  
  // Rough estimates for materials
  const frameLength = (width + height) * 2; // Perimeter
  const glassArea = area;
  const mdfArea = area;
  
  return {
    frame: {
      amount: Math.ceil(frameLength / 36), // Assuming 36" pieces
      unit: 'pieces',
    },
    glass: {
      amount: Math.ceil(glassArea / (48 * 36) * 100) / 100, // Fraction of 48x36 sheet
      unit: 'sheets',
    },
    mdf: {
      amount: Math.ceil(mdfArea / (96 * 48) * 100) / 100, // Fraction of 96x48 sheet
      unit: 'sheets',
    },
    backing: {
      amount: Math.ceil(area / 100), // Rough estimate
      unit: 'pieces',
    },
    hardware: {
      brackets: Math.ceil(width / 12), // Every 12 inches
      hooks: 2,
      pins: Math.ceil((width + height) / 6), // Every 6 inches
      unit: 'sets',
    },
  };
};

export default {
  calculateOrderCost,
  calculateMultiSizeCost,
  formatLKR,
  getDeadlineOptions,
  calculateWithDeadline,
  estimateMaterials,
  MATERIAL_PRICES,
  CREDIT_CONSUMPTION,
};
