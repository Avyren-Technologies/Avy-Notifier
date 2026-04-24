/**
 * Timezone Utility Functions (Web)
 *
 * Converts UTC timestamps from the database to Indian Standard Time (IST, UTC+5:30).
 * The database stores all timestamps in UTC; these functions ensure consistent
 * IST conversion regardless of the browser's local timezone.
 */

/**
 * Convert a database timestamp string to an IST Date.
 *
 * If the input carries timezone information (Z, +, -) it is treated as UTC and
 * shifted by +5:30. Otherwise it is assumed to already represent IST and parsed
 * as-is (local-time).
 */
export const convertToIST = (dateString: string): Date => {
  try {
    const hasTimezone =
      dateString.includes('Z') ||
      dateString.includes('+') ||
      // Avoid matching the '-' in a plain date like "2024-01-15"
      /T.*-/.test(dateString);

    if (hasTimezone) {
      const utcDate = new Date(dateString);

      if (isNaN(utcDate.getTime())) {
        console.error('Invalid UTC date string:', dateString);
        return new Date();
      }

      // Extract UTC components
      const utcYear = utcDate.getUTCFullYear();
      const utcMonth = utcDate.getUTCMonth();
      const utcDay = utcDate.getUTCDate();
      const utcHours = utcDate.getUTCHours();
      const utcMinutes = utcDate.getUTCMinutes();
      const utcSeconds = utcDate.getUTCSeconds();
      const utcMilliseconds = utcDate.getUTCMilliseconds();

      // Add 5 hours 30 minutes for IST offset
      let istMinutes = utcMinutes + 30;
      let istHours = utcHours + 5;
      let istDay = utcDay;
      let istMonth = utcMonth;
      let istYear = utcYear;

      if (istMinutes >= 60) {
        istHours += 1;
        istMinutes -= 60;
      }

      if (istHours >= 24) {
        istHours -= 24;
        istDay += 1;

        // Simplified day-overflow handling
        const daysInMonth = new Date(istYear, istMonth + 1, 0).getDate();
        if (istDay > daysInMonth) {
          istDay = 1;
          istMonth += 1;
          if (istMonth > 11) {
            istMonth = 0;
            istYear += 1;
          }
        }
      }

      // Build the IST date using the UTC constructor so the browser's local
      // offset does not interfere with the stored values.
      return new Date(
        Date.UTC(
          istYear,
          istMonth,
          istDay,
          istHours,
          istMinutes,
          utcSeconds,
          utcMilliseconds,
        ),
      );
    }

    // No timezone info -- treat as already-IST
    const cleanTimestamp = dateString.replace(' ', 'T');
    const istDate = new Date(cleanTimestamp);

    if (isNaN(istDate.getTime())) {
      console.error('Invalid IST date string:', dateString);
      return new Date();
    }

    return istDate;
  } catch (error) {
    console.error('Error converting to IST:', error, 'Input:', dateString);
    return new Date();
  }
};

/**
 * Format time in IST as HH:MM (24-hour).
 */
export const formatTimeIST = (dateString: string): string => {
  const istDate = convertToIST(dateString);
  const hours = istDate.getUTCHours().toString().padStart(2, '0');
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format time in IST as HH:MM AM/PM (12-hour).
 */
export const formatTimestampIST = (dateString: string): string => {
  const istDate = convertToIST(dateString);
  let hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;
  const formattedHours = hours.toString().padStart(2, '0');

  return `${formattedHours}:${minutes} ${ampm}`;
};

/**
 * Format time in IST as HH:MM:SS AM/PM (12-hour with seconds).
 */
export const formatTimestampWithSecondsIST = (dateString: string): string => {
  try {
    // Handle bare time strings like "23:48:43" — already in IST, just format them
    const bareTimeMatch = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(dateString);
    if (bareTimeMatch) {
      let hours = parseInt(bareTimeMatch[1], 10);
      const minutes = bareTimeMatch[2];
      const seconds = bareTimeMatch[3];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    }

    const hasTimezone =
      dateString.includes('Z') ||
      dateString.includes('+') ||
      /T.*-/.test(dateString);

    if (hasTimezone) {
      const utcDate = new Date(dateString);

      if (isNaN(utcDate.getTime())) {
        console.error('Invalid UTC date string:', dateString);
        return 'Invalid Time';
      }

      let istHours = utcDate.getUTCHours() + 5;
      let istMinutes = utcDate.getUTCMinutes() + 30;
      const seconds = utcDate.getUTCSeconds();

      if (istMinutes >= 60) {
        istHours += 1;
        istMinutes -= 60;
      }
      if (istHours >= 24) {
        istHours -= 24;
      }

      const ampm = istHours >= 12 ? 'PM' : 'AM';
      let displayHours = istHours % 12 || 12;

      return `${displayHours.toString().padStart(2, '0')}:${istMinutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
    }

    // No timezone -- already IST
    const cleanTimestamp = dateString.replace(' ', 'T');
    const istDate = new Date(cleanTimestamp);

    if (isNaN(istDate.getTime())) {
      console.error('Invalid IST date string:', dateString);
      return 'Invalid Time';
    }

    let hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, '0');
    const seconds = istDate.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  } catch (error) {
    console.error(
      'Error formatting timestamp with seconds IST:',
      error,
      'Input:',
      dateString,
    );
    return 'Invalid Time';
  }
};

/**
 * Format full date-time in IST as "Mon Day, Year HH:MM:SS AM/PM".
 */
export const formatFullDateTimeIST = (dateString: string): string => {
  try {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const hasTimezone =
      dateString.includes('Z') ||
      dateString.includes('+') ||
      /T.*-/.test(dateString);

    if (hasTimezone) {
      const utcDate = new Date(dateString);
      if (isNaN(utcDate.getTime())) {
        console.error('Invalid UTC date string:', dateString);
        return 'Invalid Date';
      }

      let istYear = utcDate.getUTCFullYear();
      let istMonth = utcDate.getUTCMonth();
      let istDay = utcDate.getUTCDate();
      let istHours = utcDate.getUTCHours() + 5;
      let istMinutes = utcDate.getUTCMinutes() + 30;
      const seconds = utcDate.getUTCSeconds();

      if (istMinutes >= 60) {
        istHours += 1;
        istMinutes -= 60;
      }
      if (istHours >= 24) {
        istHours -= 24;
        istDay += 1;
        const daysInMonth = new Date(istYear, istMonth + 1, 0).getDate();
        if (istDay > daysInMonth) {
          istDay = 1;
          istMonth += 1;
          if (istMonth > 11) {
            istMonth = 0;
            istYear += 1;
          }
        }
      }

      const ampm = istHours >= 12 ? 'PM' : 'AM';
      let displayHours = istHours % 12 || 12;

      return `${monthNames[istMonth]} ${istDay}, ${istYear} ${displayHours
        .toString()
        .padStart(2, '0')}:${istMinutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
    }

    // No timezone -- already IST
    const cleanTimestamp = dateString.replace(' ', 'T');
    const istDate = new Date(cleanTimestamp);
    if (isNaN(istDate.getTime())) {
      console.error('Invalid IST date string:', dateString);
      return 'Invalid Date';
    }

    const month = monthNames[istDate.getMonth()];
    const day = istDate.getDate();
    const year = istDate.getFullYear();
    let hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, '0');
    const seconds = istDate.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} ${hours
      .toString()
      .padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  } catch (error) {
    console.error(
      'Error formatting full date time IST:',
      error,
      'Input:',
      dateString,
    );
    return 'Invalid Date';
  }
};

/**
 * Format full timestamp in IST as "DD/MM/YYYY HH:MM AM/PM".
 */
export const formatFullTimestampIST = (dateString: string): string => {
  const istDate = convertToIST(dateString);

  const day = istDate.getUTCDate().toString().padStart(2, '0');
  const month = (istDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getUTCFullYear();
  const dateStr = `${day}/${month}/${year}`;

  let hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

  return `${dateStr} ${timeStr}`;
};

/**
 * Format date for chart labels, adapting detail level to the timeframe.
 *
 * @param dateString - UTC timestamp from the database
 * @param timeframe  - Time range in hours (1, 6, 24, etc.)
 */
export const formatChartLabelIST = (
  dateString: string,
  timeframe: number,
): string => {
  const istDate = convertToIST(dateString);

  if (timeframe === 1 || timeframe === 6) {
    const hours = istDate.getUTCHours().toString().padStart(2, '0');
    const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // 24-hour or longer
  const hours = istDate.getUTCHours().toString().padStart(2, '0');
  return `${hours}h`;
};

/**
 * Get the current date-time expressed in IST.
 */
export const getCurrentIST = (): Date => {
  const now = new Date();
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  return new Date(now.getTime() + istOffsetMs);
};
