import { getAttendance, getMyAttendance } from "../../../../services/attendanceService";
import { normalizedMode } from "../utils/attendanceHelpers";

const normalizeValue = value => String(value || "").trim().toUpperCase();
const collectPermissions = (user, authAccess) => {
  const values = [...(Array.isArray(authAccess?.permissions) ? authAccess.permissions : []), ...(Array.isArray(user?.permissions) ? user.permissions : [])];
  return new Set(values.map(normalizeValue));
};
const collectMemberships = (user, authAccess) => {
  const candidates = [authAccess?.departmentMemberships, authAccess?.memberships, authAccess?.departments, user?.departmentMemberships, user?.memberships];
  const memberships = candidates.find(Array.isArray) || [];
  const primary = authAccess?.primaryDepartment || user?.primaryDepartment || null;
  if (primary && typeof primary === "object") {
    return [...memberships, primary];
  }
  return memberships;
};
const findHrMembership = memberships => {
  return memberships.find(membership => {
    const department = membership?.department || membership;
    const code = normalizeValue(department?.code || membership?.departmentCode);
    const name = normalizeValue(department?.name || membership?.departmentName);
    return code === "HR" || name === "HR" || name === "HUMAN RESOURCES";
  });
};
const resolveAttendanceAccess = (user, authAccess) => {
  const permissions = collectPermissions(user, authAccess);
  const memberships = collectMemberships(user, authAccess);
  const systemRole = normalizeValue(authAccess?.systemRole || user?.systemRole || user?.role);
  const legacyRole = normalizeValue(user?.role);
  const globalSuperAdmin = Boolean(authAccess?.globalSuperAdmin || authAccess?.superAdmin || systemRole === "SUPER_ADMIN" || legacyRole === "SUPER_ADMIN");
  const hrMembership = findHrMembership(memberships);
  const hrRole = normalizeValue(hrMembership?.role || hrMembership?.departmentRole);
  const isHrHead = Boolean(hrMembership) && ["HOD", "HEAD", "DEPARTMENT_HEAD", "DEPARTMENT_SUPER_ADMIN", "ADMIN"].includes(hrRole);
  const isHead = legacyRole === "HEAD" || memberships.some(membership => ["HOD", "HEAD", "DEPARTMENT_HEAD", "DEPARTMENT_SUPER_ADMIN"].includes(normalizeValue(membership?.role || membership?.departmentRole)));
  const isManager = legacyRole === "MANAGER";
  const canViewAll = globalSuperAdmin || permissions.has("ATTENDANCE_VIEW_ALL");
  const canViewTeam = permissions.has("ATTENDANCE_VIEW_TEAM") || isManager;
  const canViewRegister = canViewAll || canViewTeam || isHead || isHrHead;
  const canRegularizeSelf = globalSuperAdmin || permissions.has("ATTENDANCE_REGULARIZE_SELF");
  const canApproveRegularization = globalSuperAdmin || permissions.has("ATTENDANCE_APPROVE_REGULARIZATION");
  const canViewLocations = globalSuperAdmin || isHrHead || permissions.has("ATTENDANCE_VIEW_FIELD_LOCATION");
  const canExport = globalSuperAdmin || isHrHead || (canViewAll && permissions.has("ATTENDANCE_EXPORT"));
  return {
    globalSuperAdmin,
    isHrHead,
    isHead,
    isManager,
    canViewAll,
    canViewTeam,
    canViewRegister,
    canRegularizeSelf,
    canApproveRegularization,
    canViewLocations,
    canExport
  };
};
const getBrowserLocation = () => new Promise((resolve, reject) => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    reject(new Error("Location is not supported by this browser."));
    return;
  }
  if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    reject(new Error("Location requires a secure HTTPS connection."));
    return;
  }
  const request = highAccuracy => navigator.geolocation.getCurrentPosition(position => {
    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    const accuracy = Number(position?.coords?.accuracy);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      reject(new Error("Browser returned an invalid latitude."));
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      reject(new Error("Browser returned an invalid longitude."));
      return;
    }
    resolve({
      latitude,
      longitude,
      accuracyMeters: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null
    });
  }, geoError => {
    console.error("[Attendance] Geolocation error:", {
      code: geoError?.code,
      message: geoError?.message
    });
    // Laptops often obtain location through Wi-Fi rather than a GPS sensor.
    // Retry unavailable/timeout responses with standard accuracy, never a cached fix.
    if (highAccuracy && [2, 3].includes(geoError?.code)) {
      request(false);
      return;
    }
    if (geoError?.code === 1) {
      reject(new Error("Location access is blocked. Allow location for this app in your browser and device settings, then try again."));
      return;
    }
    if (geoError?.code === 2) {
      reject(new Error("Your device could not determine your current location. Enable Location Services for your browser in device settings, check Wi-Fi or internet access, and try again."));
      return;
    }
    if (geoError?.code === 3) {
      reject(new Error("Location request timed out. Check Location Services and try again."));
      return;
    }
    reject(new Error("Your current location could not be obtained."));
  }, {
    enableHighAccuracy: highAccuracy,
    timeout: highAccuracy ? 12000 : 15000,
    maximumAge: 0
  });
  request(true);
});

export { resolveAttendanceAccess, getBrowserLocation };

export const messageOf = error => error?.response?.data?.message || error?.message || "Attendance could not be loaded. Please try again.";
export const dateOf = record => String(record?.businessDate || record?.date || "").slice(0, 10);
export const checkInOf = record => record?.firstInAt || record?.firstIn?.time;
export const checkOutOf = record => record?.lastOutAt || record?.lastOut?.time;
export const personKey = record => String(record?.employeeId?._id || record?.employeeId || `device:${record?.attendanceDeviceId || record?.deviceCode || record?.officeId || ""}:${record?.biometricCode || record?.employeeCode}`);
export const isWebSession = record =>
  String(record?.primarySource || record?.source || "").toUpperCase() === "WEB" &&
  ["WFH", "FIELD_VISIT", "ON_DUTY"].includes(normalizedMode(record));
export const dayStatus = (record, date, today) => {
  if (date > today && !record) return "Upcoming";
  if (!record) return "No record";
  if (record.synthetic || record.noAttendanceRecord) return "Not marked";
  if (checkInOf(record) && !checkOutOf(record)) return date === today ? "Checked in" : "Missing checkout";
  return ({ PRESENT: "Present", ABSENT: "Absent", ON_LEAVE: "On leave", HALF_DAY: "Half day", WEEK_OFF: "Week off", HOLIDAY: "Holiday", NOT_MARKED: "Not marked" })[record.presenceStatus] || "No record";
};
export const toneOf = status => /Present|Checked in/.test(status) ? "good" : /Absent|Missing/.test(status) ? "bad" : /leave|Half|Late/.test(status) ? "warn" : "neutral";
// Keep unknown days neutral: missing records do not prove absence or a week off.
export const calendarTone = status => ({
  Present: "present", "Checked in": "present", Absent: "absent",
  "On leave": "leave", "Half day": "half", "Week off": "off",
  Holiday: "holiday", "Missing checkout": "missing"
})[status] || "unknown";
export const monthBounds = month => {
  const [year, number] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${month}-${new Date(Date.UTC(year, number, 0)).getUTCDate()}` };
};
export const calendarDays = month => {
  const [year, number] = month.split("-").map(Number);
  const blanks = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  return [...Array(blanks).fill(null), ...Array.from({ length: new Date(Date.UTC(year, number, 0)).getUTCDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)];
};

// The current API reports totals for the returned slice. Continue through full
// slices rather than trusting that total, and remove repeated synthetic rows.
export async function loadAttendanceRange(query, personal = false) {
  const request = personal ? getMyAttendance : getAttendance;
  const rows = new Map();
  let truncated = false;
  for (let page = 1; page <= 100; page += 1) {
    const result = await request({ ...query, page, limit: 500, includeUnmapped: !personal });
    const items = result?.items || result?.records || [];
    const unmapped = personal ? [] : result?.biometric?.unmapped || result?.biometric?.items || [];
    truncated ||= Boolean(result?.biometric?.truncated);
    [...items, ...unmapped.map(record => ({ ...record, isBiometricOnly: !record.employeeId }))].forEach(record => {
      const key = `${personKey(record)}:${dateOf(record)}`;
      const previous = rows.get(key);
      if (!previous || (!record.synthetic && !record.noAttendanceRecord)) rows.set(key, record);
    });
    const actualCount = items.filter(record => !record.synthetic && !record.noAttendanceRecord).length;
    if (actualCount < 500) return { records: [...rows.values()], truncated };
  }
  throw new Error("This attendance range is too large. Choose one day or one employee and try again.");
}

export function mobileAttendanceAccess(user, authAccess) {
  const existing = resolveAttendanceAccess(user, authAccess);
  const scope = String(authAccess?.accessMap?.ATTENDANCE?.VIEW || "").toUpperCase();
  const permissions = [...(Array.isArray(user?.permissions) ? user.permissions : []), ...(Array.isArray(authAccess?.permissions) ? authAccess.permissions : [])].map(normalizeValue);
  return {
    ...existing,
    canViewRegister: existing.canViewRegister || Boolean(authAccess?.fullAccess) || normalizeValue(user?.role) === "ADMIN" || ["ALL", "TEAM", "DEPARTMENT"].includes(scope),
    canViewLocationHistory: existing.globalSuperAdmin || permissions.includes("ATTENDANCE_VIEW_FIELD_LOCATION"),
  };
}
