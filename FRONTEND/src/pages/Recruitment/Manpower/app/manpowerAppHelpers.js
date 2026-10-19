const EMPTY_FORM = {
  department: "",
  positionTitle: "",
  numberOfOpenings: "1",
  requiredSkills: "",
  minimumExperienceYears: "",
  maximumExperienceYears: "",
  monthlySalaryMin: "",
  monthlySalaryMax: "",
  currency: "INR",
  employmentType: "FULL_TIME",
  shiftAvailability: "DAY",
  officeId: "",
  location: "",
  requiredByDate: "",
  reason: "",
  priority: "NORMAL"
};

const FORM_RULES = {
  positionTitleMinLength: 2,
  reasonMinLength: 5,
  minimumOpenings: 1,
  minimumExperience: 0,
  minimumSalary: 0
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toNullableNumber = value => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatAmount = (value, currency = "INR") => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(number);
  } catch (error) {
    return String(number);
  }
};

const normalizeDepartmentList = response => {
  const payload = response?.data?.data || response?.data || {};
  const records = Array.isArray(payload) ? payload : payload?.departments || payload?.records || payload?.items || [];
  return (Array.isArray(records) ? records : []).filter(item => item && String(item.status || "ACTIVE").toUpperCase() === "ACTIVE").sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
};

const getFormErrors = (form, todayKey) => {
  const errors = {};
  if (!String(form.department || "").trim()) {
    errors.department = "Select the department requesting this manpower.";
  }
  const positionTitle = String(form.positionTitle || "").trim();
  if (!positionTitle) {
    errors.positionTitle = "Position title is required.";
  } else if (positionTitle.length < FORM_RULES.positionTitleMinLength) {
    errors.positionTitle = "Enter a valid position title.";
  }
  const openings = Number(form.numberOfOpenings);
  if (!Number.isInteger(openings) || openings < FORM_RULES.minimumOpenings) {
    errors.numberOfOpenings = "Openings must be a whole number of at least 1.";
  }
  const minimumExperience = toNullableNumber(form.minimumExperienceYears);
  const maximumExperience = toNullableNumber(form.maximumExperienceYears);
  if (minimumExperience !== null && minimumExperience < FORM_RULES.minimumExperience) {
    errors.minimumExperienceYears = "Minimum experience cannot be negative.";
  }
  if (maximumExperience !== null && maximumExperience < FORM_RULES.minimumExperience) {
    errors.maximumExperienceYears = "Maximum experience cannot be negative.";
  }
  if (minimumExperience !== null && maximumExperience !== null && maximumExperience < minimumExperience) {
    errors.minimumExperienceYears = "Minimum experience cannot exceed maximum experience.";
    errors.maximumExperienceYears = `Maximum experience must be at least ${minimumExperience} years.`;
  }
  if (!form.requiredByDate) {
    errors.requiredByDate = "Required-by date is required.";
  } else if (form.requiredByDate < todayKey) {
    errors.requiredByDate = "Required-by date cannot be in the past.";
  }
  if (!String(form.officeId || "").trim()) {
    errors.officeId = "Select the work location.";
  }
  const monthlySalaryMin = toNullableNumber(form.monthlySalaryMin);
  const monthlySalaryMax = toNullableNumber(form.monthlySalaryMax);
  if (monthlySalaryMin !== null && monthlySalaryMin < FORM_RULES.minimumSalary) {
    errors.monthlySalaryMin = "Minimum monthly salary cannot be negative.";
  }
  if (monthlySalaryMax !== null && monthlySalaryMax < FORM_RULES.minimumSalary) {
    errors.monthlySalaryMax = "Maximum monthly salary cannot be negative.";
  }
  if (monthlySalaryMin !== null && monthlySalaryMax !== null && monthlySalaryMax < monthlySalaryMin) {
    errors.monthlySalaryMin = "Minimum salary cannot exceed maximum salary.";
    errors.monthlySalaryMax = `Maximum salary must be at least ${formatAmount(monthlySalaryMin, form.currency)} per month.`;
  }
  const reason = String(form.reason || "").trim();
  if (!reason) {
    errors.reason = "Business reason is required.";
  } else if (reason.length < FORM_RULES.reasonMinLength) {
    errors.reason = "Add a little more detail about why this manpower is required.";
  }
  return errors;
};

export { EMPTY_FORM, getTodayKey, normalizeDepartmentList, getFormErrors };

export const recordId = (value) => String(
  typeof value === "object" && value !== null ? value._id || value.id || "" : value || ""
);

export const buildManpowerPayload = (form, offices) => {
  const office = offices.find((item) => recordId(item) === form.officeId);
  if (!office) throw new Error("Select an available work location.");
  const min = toNullableNumber(form.monthlySalaryMin);
  const max = toNullableNumber(form.monthlySalaryMax);
  return {
    department: form.department,
    positionTitle: form.positionTitle.trim(),
    numberOfOpenings: Number(form.numberOfOpenings),
    requiredSkills: form.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean),
    minimumExperienceYears: toNullableNumber(form.minimumExperienceYears) ?? 0,
    maximumExperienceYears: toNullableNumber(form.maximumExperienceYears),
    budgetMin: min === null ? null : min * 12,
    budgetMax: max === null ? null : max * 12,
    currency: form.currency,
    employmentType: form.employmentType,
    location: office.name,
    requiredByDate: form.requiredByDate,
    reason: form.reason.trim(),
    priority: form.priority,
  };
};

export const listRecords = (response) => Array.isArray(response)
  ? response
  : response?.records || response?.requirements || [];
