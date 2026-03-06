/**
 * Unit converter: cm/mm → meters, dimension parsing
 */

/**
 * Parse dimensions from string like "159×60×240", "200 cm", "1.8 м", "1800 мм" etc.
 * Returns length in meters
 */
function parseLength(input) {
    if (typeof input !== 'string') input = String(input);
    input = input.trim().toLowerCase().replace(/,/g, '.');

    // Format: "159×60×240" or "159x60x240" — first number is length
    const dimMatch = input.match(/^(\d+(?:\.\d+)?)\s*[×xх]\s*(\d+(?:\.\d+)?)\s*[×xх]\s*(\d+(?:\.\d+)?)/);
    if (dimMatch) {
        const value = parseFloat(dimMatch[1]);
        // Determine units: if > 100, likely cm; if > 1000, likely mm
        if (value > 100) return value / 1000; // mm → m
        if (value > 10) return value / 100;   // cm → m
        return value; // already meters
    }

    // Format with explicit units
    const unitMatch = input.match(/^(\d+(?:\.\d+)?)\s*(мм|mm|см|cm|м|m)?$/);
    if (unitMatch) {
        const value = parseFloat(unitMatch[1]);
        const unit = unitMatch[2] || '';

        if (unit === 'мм' || unit === 'mm') return value / 1000;
        if (unit === 'см' || unit === 'cm') return value / 100;
        if (unit === 'м' || unit === 'm') return value;

        // No unit: guess based on magnitude
        if (value > 100) return value / 100;  // likely cm
        if (value > 10) return value / 100;   // likely cm
        return value; // likely meters
    }

    // Try simply parsing a number
    const num = parseFloat(input);
    if (!isNaN(num)) {
        if (num > 100) return num / 100;
        if (num > 10) return num / 100;
        return num;
    }

    return null;
}

module.exports = { parseLength };
