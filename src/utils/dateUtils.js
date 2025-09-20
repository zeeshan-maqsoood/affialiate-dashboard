/**
 * Get current UTC timestamp in YYYY-MM-DD HH:MM:SS format
 */
export const getCurrentUTCTimestamp = () => {
  const now = new Date();
  return formatDateToUTC(now);
};

/**
 * Format a date object to UTC YYYY-MM-DD HH:MM:SS
 */
export const formatDateToUTC = (date) => {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");
};

/**
 * Format a date for display in local time
 */
export const formatDateForDisplay = (dateString) => {
  // If the dateString is already in YYYY-MM-DD HH:MM:SS format
  // We need to convert it to ISO format for the Date constructor
  if (dateString.includes(" ")) {
    dateString = dateString.replace(" ", "T") + "Z";
  }
  const date = new Date(dateString);
  return date.toLocaleString();
};
