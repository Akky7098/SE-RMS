import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createEmployee,
  getEmployeeById,
  getEmployeeMeta,
  getEmployees,
  updateEmployee,
} from "../../../services/employeeService";

import "./Employees.css";


/* =========================================================
   COMPANY CONFIG
========================================================= */

const COMPANY_CONFIG = [
  {
    value: "SANDEEP_EDGETECH",
    label: "Sandeep Edgetech",
    prefix: "SE",
  },
  {
    value: "SANDEEP_ENTERPRISES",
    label: "Sandeep Enterprises",
    prefix: "SE",
  },
  {
    value: "VANIJA",
    label: "Vanija",
    prefix: "VI",
  },
  {
    value: "VESS",
    label: "VESS",
    prefix: "VE",
  },
  {
    value: "SI",
    label: "SI",
    prefix: "SI",
  },
  {
    value: "FERMECH",
    label: "Fermech",
    prefix: "FM",
  },
  {
    value: "SF",
    label: "SF",
    prefix: "SF",
  },
  {
    value: "MULTIPACK",
    label: "Multipack",
    prefix: "MP",
  },
];


/* =========================================================
   PROFILE PHOTO CONFIG
========================================================= */

const PROFILE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const PROFILE_PHOTO_MAX_SIZE =
  2 * 1024 * 1024;


/* =========================================================
   INITIAL FORM
========================================================= */

const INITIAL_FORM = {
  employeeCode: "",
  companyCode: "",
  fullName: "",
  personalEmail: "",
  officialEmail: "",
  mobileNumber: "",
  department: "",
  orgUnitCode: "",
  designation: "",
  reportsTo: "",
  employmentType: "PERMANENT",
  joiningDate: "",
  workLocation: "",
  biometricCode: "",
  profilePhotoUrl: "",
  status: "ACTIVE",
};


/* =========================================================
   HELPERS
========================================================= */

const dateInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
};


const digits = (
  value,
  max = 10
) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, max);


const normalise = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();


const prettyValue = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );


const getEmployeeCompanyCode = (
  employee
) => {
  return normalise(
    employee?.companyCode
  );
};


const getEmployeeInitials = (
  name
) => {
  const cleanName =
    String(name || "")
      .trim();

  if (!cleanName) {
    return "EMP";
  }

  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part?.[0] || ""
    )
    .join("")
    .toUpperCase();
};


/* =========================================================
   GET NEXT EMPLOYEE CODE
========================================================= */

const generateNextCode = (
  employees,
  companyCode
) => {
  const company =
    COMPANY_CONFIG.find(
      (item) =>
        item.value ===
        companyCode
    );

  if (!company) {
    return "";
  }

  const prefix =
    company.prefix;

  let highest = 0;

  (employees || []).forEach(
    (employee) => {
      const employeeCompany =
        getEmployeeCompanyCode(
          employee
        );

      const code =
        normalise(
          employee?.employeeCode
        );

      if (!code) {
        return;
      }

      const companyMatches =
        employeeCompany ===
        companyCode;

      const prefixMatches =
        code.startsWith(
          prefix
        );

      if (
        !companyMatches &&
        !prefixMatches
      ) {
        return;
      }

      const escapedPrefix =
        prefix.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const match =
        code.match(
          new RegExp(
            `^${escapedPrefix}-?(\\d+)$`
          )
        );

      if (!match) {
        return;
      }

      const number =
        Number(
          match[1]
        );

      if (
        Number.isFinite(
          number
        ) &&
        number > highest
      ) {
        highest =
          number;
      }
    }
  );

  const nextNumber =
    highest > 0
      ? highest + 1
      : 1001;

  return `${prefix}${nextNumber}`;
};


/* =========================================================
   COMPONENT
========================================================= */

function EmployeeFormPage() {
  const {
    employeeId,
  } = useParams();

  const navigate =
    useNavigate();

  const editing =
    Boolean(
      employeeId
    );


  /* =======================================================
     FORM STATE
  ======================================================= */

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );

  const [
    meta,
    setMeta,
  ] = useState(null);

  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     PROFILE PHOTO STATE
  ======================================================= */

  const [
    profilePhotoFile,
    setProfilePhotoFile,
  ] = useState(null);

  const [
    profilePhotoPreview,
    setProfilePhotoPreview,
  ] = useState("");

  const [
    profilePhotoRemoved,
    setProfilePhotoRemoved,
  ] = useState(false);


  /* =======================================================
     AUTO CODE STATE
  ======================================================= */

  const [
    employeeCodeEdited,
    setEmployeeCodeEdited,
  ] = useState(false);

  const [
    biometricCodeEdited,
    setBiometricCodeEdited,
  ] = useState(false);


  /* =======================================================
     CLOSE
  ======================================================= */

  const closeForm = () => {
    navigate(
      editing
        ? `/people/employees/${employeeId}`
        : "/people/employees"
    );
  };


  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const load =
      async () => {
        try {
          setLoading(true);
          setError("");

          const [
            metaResult,
            employeeResult,
            employeesResult,
          ] =
            await Promise.all([
              getEmployeeMeta(),

              editing
                ? getEmployeeById(
                    employeeId
                  )
                : Promise.resolve(
                    null
                  ),

              getEmployees({
                page: 1,
                limit: 1000,
                status: "ACTIVE",
              }),
            ]);

          if (!mounted) {
            return;
          }

          setMeta(
            metaResult || {}
          );

          const records =
            employeesResult
              ?.records ||
            employeesResult
              ?.employees ||
            employeesResult
              ?.data ||
            [];

          setEmployees(
            Array.isArray(
              records
            )
              ? records
              : []
          );

          if (
            employeeResult
          ) {
            const photoUrl =
              employeeResult
                ?.profilePhotoUrl ||
              "";

            setForm({
              employeeCode:
                employeeResult
                  ?.employeeCode ||
                "",

              companyCode:
                employeeResult
                  ?.companyCode ||
                "",

              fullName:
                employeeResult
                  ?.fullName ||
                "",

              personalEmail:
                employeeResult
                  ?.personalEmail ||
                "",

              officialEmail:
                employeeResult
                  ?.officialEmail ||
                "",

              mobileNumber:
                employeeResult
                  ?.mobileNumber ||
                "",

              department:
                employeeResult
                  ?.departmentId ||
                employeeResult
                  ?.department
                  ?._id ||
                employeeResult
                  ?.department
                  ?.id ||
                "",

              orgUnitCode:
                employeeResult
                  ?.orgUnitCode ||
                "",

              designation:
                employeeResult
                  ?.designation ||
                "",

              reportsTo:
                employeeResult
                  ?.reportingManagerId ||
                employeeResult
                  ?.reportsTo
                  ?._id ||
                employeeResult
                  ?.reportsTo
                  ?.id ||
                "",

              employmentType:
                employeeResult
                  ?.employmentType ||
                "PERMANENT",

              joiningDate:
                dateInput(
                  employeeResult
                    ?.joiningDate
                ),

              workLocation:
                employeeResult
                  ?.workLocation ||
                "",

              biometricCode:
                employeeResult
                  ?.biometricCode ||
                "",

              profilePhotoUrl:
                photoUrl,

              status:
                employeeResult
                  ?.status ||
                "ACTIVE",
            });

            setProfilePhotoPreview(
              photoUrl
            );

            setProfilePhotoFile(
              null
            );

            setProfilePhotoRemoved(
              false
            );

            setEmployeeCodeEdited(
              true
            );

            setBiometricCodeEdited(
              true
            );
          }
        } catch (
          requestError
        ) {
          if (!mounted) {
            return;
          }

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "Employee form could not be loaded."
          );
        } finally {
          if (mounted) {
            setLoading(
              false
            );
          }
        }
      };

    load();

    return () => {
      mounted = false;
    };
  }, [
    editing,
    employeeId,
  ]);


  /* =======================================================
     CLEANUP LOCAL PHOTO PREVIEW
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        profilePhotoPreview &&
        profilePhotoPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          profilePhotoPreview
        );
      }
    };
  }, [
    profilePhotoPreview,
  ]);


  /* =======================================================
     META OPTIONS
  ======================================================= */

 const departments = useMemo(() => {
  const values = meta?.departments || [];

  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((department) => {
      if (typeof department === "string") {
        return {
          value: department,
          name: prettyValue(department),
          code: department,
        };
      }

      const value =
        department?._id ||
        department?.id ||
        department?.value ||
        department?.code ||
        department?.name ||
        "";

      return {
        ...department,
        value: String(value),
        name:
          department?.name ||
          department?.label ||
          prettyValue(value),
      };
    })
    .filter((department) => Boolean(department.value));
}, [meta]);


  const orgUnits =
    useMemo(() => {
      const values =
        meta?.orgUnits ||
        meta
          ?.organizationUnits ||
        meta
          ?.orgUnitCodes ||
        [];

      return Array.isArray(
        values
      )
        ? values
        : [];
    }, [meta]);


  const employmentTypes =
    useMemo(
      () =>
        meta
          ?.employmentTypes ||
        [
          "PERMANENT",
          "PROBATION",
          "CONTRACT",
          "TRAINEE",
          "INTERN",
          "CONSULTANT",
        ],
      [meta]
    );


  const statuses =
    useMemo(
      () =>
        meta?.statuses ||
        [
          "ACTIVE",
          "INACTIVE",
          "NOTICE_PERIOD",
          "EXITED",
        ],
      [meta]
    );


  /* =======================================================
     COMPANY OPTIONS
  ======================================================= */

  const companyOptions =
    useMemo(() => {
      const backendCompanies =
        meta?.companies ||
        meta?.companyCodes ||
        [];

      if (
        !Array.isArray(
          backendCompanies
        ) ||
        backendCompanies.length ===
          0
      ) {
        return COMPANY_CONFIG;
      }

      return backendCompanies
        .map(
          (item) => {
            if (
              typeof item ===
              "string"
            ) {
              const local =
                COMPANY_CONFIG.find(
                  (
                    company
                  ) =>
                    company.value ===
                    item
                );

              return (
                local || {
                  value:
                    item,

                  label:
                    prettyValue(
                      item
                    ),

                  prefix:
                    "",
                }
              );
            }

            const value =
              item?.value ||
              item?.code ||
              item
                ?.companyCode ||
              "";

            const local =
              COMPANY_CONFIG.find(
                (
                  company
                ) =>
                  company.value ===
                  value
              );

            return {
              value,

              label:
                item?.label ||
                item?.name ||
                local?.label ||
                prettyValue(
                  value
                ),

              prefix:
                item?.prefix ||
                local?.prefix ||
                "",
            };
          }
        )
        .filter(
          (item) =>
            Boolean(
              item?.value
            )
        );
    }, [meta]);

/* =========================================================
   REPORTING MANAGERS
   Company -> Organisation -> Department -> Manager

   Rules:
   1. No company       -> no managers
   2. No org unit      -> no managers
   3. No department    -> no managers
   4. Same department employees are candidates
   5. Their reporting chain is also included
   6. Current employee is excluded while editing
   7. Never show every employee blindly
========================================================= */

const reportingManagers = useMemo(() => {
  if (
    !form.companyCode ||
    !form.orgUnitCode ||
    !form.department
  ) {
    return [];
  }

  const currentEmployeeId =
    String(employeeId || "");

  const getId = (employee) =>
    String(
      employee?._id ||
        employee?.id ||
        ""
    );

  const getDepartmentId = (employee) =>
  String(
    employee?.departmentId ||
      employee?.department?._id ||
      employee?.department?.id ||
      employee?.department?.value ||
      employee?.department?.code ||
      employee?.department?.name ||
      employee?.department ||
      ""
  );

  const getReportsToId = (employee) =>
    String(
      employee?.reportingManagerId ||
        employee?.reportsTo?._id ||
        employee?.reportsTo?.id ||
        employee?.reportsTo ||
        ""
    );

  const activeEmployees = (
    employees || []
  ).filter((employee) => {
    const id = getId(employee);

    if (!id) {
      return false;
    }

    if (
      editing &&
      id === currentEmployeeId
    ) {
      return false;
    }

    return (
      employee?.status === "ACTIVE" ||
      !employee?.status
    );
  });

  /*
   * First find employees belonging to the
   * selected company + organisation + department.
   */
  const sameDepartmentEmployees =
    activeEmployees.filter(
      (employee) => {
        const companyMatches =
          normalise(
            employee?.companyCode
          ) ===
          normalise(
            form.companyCode
          );

        const orgMatches =
          normalise(
            employee?.orgUnitCode
          ) ===
          normalise(
            form.orgUnitCode
          );

        const departmentMatches =
          getDepartmentId(
            employee
          ) ===
          String(
            form.department
          );

        return (
          companyMatches &&
          orgMatches &&
          departmentMatches
        );
      }
    );

  /*
   * Build a quick employee map so we can
   * walk upward through reportsTo.
   */
  const employeeMap =
    new Map();

  activeEmployees.forEach(
    (employee) => {
      const id =
        getId(employee);

      if (id) {
        employeeMap.set(
          id,
          employee
        );
      }
    }
  );

  /*
   * Candidate map prevents duplicates.
   */
  const candidateMap =
    new Map();

  /*
   * Add same-department employees.
   *
   * These are possible department-level
   * reporting managers.
   */
  sameDepartmentEmployees.forEach(
    (employee) => {
      const id =
        getId(employee);

      if (id) {
        candidateMap.set(
          id,
          employee
        );
      }
    }
  );

  /*
   * Now walk UP the hierarchy.
   *
   * Example:
   *
   * Cutting employee
   *      ↓
   * Varun
   *      ↓
   * Samyak
   *
   * Varun and Samyak become available,
   * without exposing unrelated employees.
   */
  sameDepartmentEmployees.forEach(
    (employee) => {
      let managerId =
        getReportsToId(
          employee
        );

      const visited =
        new Set();

      while (
        managerId &&
        !visited.has(
          managerId
        )
      ) {
        visited.add(
          managerId
        );

        const manager =
          employeeMap.get(
            managerId
          );

        if (!manager) {
          break;
        }

        const managerEmployeeId =
          getId(manager);

        if (
          managerEmployeeId &&
          !(
            editing &&
            managerEmployeeId ===
              currentEmployeeId
          )
        ) {
          candidateMap.set(
            managerEmployeeId,
            manager
          );
        }

        managerId =
          getReportsToId(
            manager
          );
      }
    }
  );

  return Array.from(
    candidateMap.values()
  ).sort((a, b) =>
    String(
      a?.fullName || ""
    ).localeCompare(
      String(
        b?.fullName || ""
      )
    )
  );
}, [
  employees,
  employeeId,
  editing,
  form.companyCode,
  form.orgUnitCode,
  form.department,
]);

  /* =======================================================
     NEXT EMPLOYEE CODE
  ======================================================= */

  const suggestedEmployeeCode =
    useMemo(
      () =>
        generateNextCode(
          employees,
          form.companyCode
        ),
      [
        employees,
        form.companyCode,
      ]
    );


  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  const update = (
    key,
    value
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );

    if (error) {
      setError("");
    }
  };


  /* =======================================================
     COMPANY CHANGE
  ======================================================= */

const handleCompanyChange = (event) => {
  const companyCode = event.target.value;

  const nextCode = generateNextCode(
    employees,
    companyCode
  );

  setForm((previous) => ({
    ...previous,

    companyCode,

    // Company changed:
    // all dependent organisation fields must reset.
    orgUnitCode: "",
    department: "",
    reportsTo: "",

    employeeCode:
      !editing && !employeeCodeEdited
        ? nextCode
        : previous.employeeCode,

    biometricCode:
      !editing && !biometricCodeEdited
        ? nextCode
        : previous.biometricCode,
  }));

  setError("");
};

const handleOrgUnitChange = (event) => {
  const value = event.target.value;

  setForm((previous) => ({
    ...previous,

    orgUnitCode: value,

    // Organisation changed:
    // department + manager must be selected again.
    department: "",
    reportsTo: "",
  }));

  setError("");
};


  /* =======================================================
     KEEP AUTO CODE UPDATED
  ======================================================= */

  useEffect(() => {
    if (
      editing ||
      !form.companyCode ||
      !suggestedEmployeeCode
    ) {
      return;
    }

    setForm(
      (previous) => {
        const next = {
          ...previous,
        };

        if (
          !employeeCodeEdited
        ) {
          next.employeeCode =
            suggestedEmployeeCode;
        }

        if (
          !biometricCodeEdited
        ) {
          next.biometricCode =
            suggestedEmployeeCode;
        }

        return next;
      }
    );
  }, [
    editing,
    form.companyCode,
    suggestedEmployeeCode,
    employeeCodeEdited,
    biometricCodeEdited,
  ]);


  /* =======================================================
     DEPARTMENT CHANGE

     Reporting manager is intentionally NOT cleared.
     Cross-department reporting is allowed.
  ======================================================= */

const handleDepartmentChange = (event) => {
  const value = event.target.value;

  setForm((previous) => ({
    ...previous,

    department: value,

    // Department changed:
    // old manager is no longer valid.
    reportsTo: "",
  }));

  setError("");
};

  /* =======================================================
     PROFILE PHOTO CHANGE
  ======================================================= */

  const handleProfilePhotoChange = (
    event
  ) => {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    if (
      !PROFILE_PHOTO_TYPES.includes(
        file.type
      )
    ) {
      setError(
        "Profile photo must be JPG, PNG or WebP."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      PROFILE_PHOTO_MAX_SIZE
    ) {
      setError(
        "Profile photo must be smaller than 2 MB."
      );

      event.target.value =
        "";

      return;
    }

    if (
      profilePhotoPreview &&
      profilePhotoPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        profilePhotoPreview
      );
    }

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setProfilePhotoFile(
      file
    );

    setProfilePhotoPreview(
      previewUrl
    );

    setProfilePhotoRemoved(
      false
    );

    setError("");
  };


  /* =======================================================
     REMOVE PROFILE PHOTO
  ======================================================= */

  const handleRemoveProfilePhoto =
    () => {
      if (
        profilePhotoPreview &&
        profilePhotoPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          profilePhotoPreview
        );
      }

      setProfilePhotoFile(
        null
      );

      setProfilePhotoPreview(
        ""
      );

      setProfilePhotoRemoved(
        true
      );

      setForm(
        (previous) => ({
          ...previous,
          profilePhotoUrl:
            "",
        })
      );

      setError("");
    };


  /* =======================================================
     VALIDATION
  ======================================================= */

  const validate = () => {
    if (
      !form.fullName.trim()
    ) {
      return "Employee name is required.";
    }

    if (
      !form.companyCode
    ) {
      return "Company is required.";
    }

    if (
      !form.employeeCode.trim()
    ) {
      return "Employee ID is required.";
    }

    if (
      form.mobileNumber &&
      digits(
        form.mobileNumber,
        10
      ).length !== 10
    ) {
      return "Mobile number must contain exactly 10 digits.";
    }

    if (
      form.personalEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.personalEmail.trim()
      )
    ) {
      return "Personal email is not valid.";
    }

    if (
      form.officialEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.officialEmail.trim()
      )
    ) {
      return "Official email is not valid.";
    }

    if (
      !form.department
    ) {
      return "Department is required.";
    }

    if (
      !form.designation.trim()
    ) {
      return "Designation is required.";
    }

    if (
      !form.orgUnitCode
    ) {
      return "Organisation unit is required.";
    }

    return "";
  };


  /* =======================================================
     SAVE

     NOTE:
     Actual binary photo upload requires backend upload API.
     Until that API exists, existing profilePhotoUrl is kept.

     We DO NOT send blob: preview URL to backend.
  ======================================================= */

  const submit =
    async (event) => {
      event.preventDefault();

      const validation =
        validate();

      if (validation) {
        setError(
          validation
        );

        return;
      }

      /*
       * Important:
       *
       * A newly selected File cannot be saved by the current
       * createEmployee/updateEmployee JSON API.
       *
       * We stop here instead of silently creating an employee
       * while losing the selected profile photo.
       */
      if (
        profilePhotoFile
      ) {
        setError(
          "Profile photo is selected, but the employee photo upload API is not connected yet. Add the upload endpoint/service before saving this photo."
        );

        return;
      }

      try {
        setSaving(true);
        setError("");

        const payload = {
          employeeCode:
            form.employeeCode
              .trim()
              .toUpperCase(),

          companyCode:
            form.companyCode,

          fullName:
            form.fullName
              .trim(),

          personalEmail:
            form.personalEmail
              .trim()
              .toLowerCase() ||
            null,

          officialEmail:
            form.officialEmail
              .trim()
              .toLowerCase() ||
            null,

          mobileNumber:
            form.mobileNumber
              ? digits(
                  form.mobileNumber,
                  10
                )
              : null,

          department:
            form.department,

          orgUnitCode:
            form.orgUnitCode,

          designation:
            form.designation
              .trim(),

          reportsTo:
            form.reportsTo ||
            null,

          employmentType:
            form.employmentType,

          joiningDate:
            form.joiningDate ||
            null,

          workLocation:
            form.workLocation
              .trim() ||
            null,

          biometricCode:
            form.biometricCode
              .trim()
              .toUpperCase() ||
            null,

          profilePhotoUrl:
            profilePhotoRemoved
              ? null
              : form
                  .profilePhotoUrl
                  ?.trim() ||
                null,

          status:
            form.status,
        };

        let result;

        if (editing) {
          result =
            await updateEmployee(
              employeeId,
              payload
            );
        } else {
          const response =
            await createEmployee(
              payload
            );

          result =
            response?.employee ||
            response;
        }

        const id =
          result?._id ||
          result?.id ||
          employeeId;

        navigate(
          id
            ? `/people/employees/${id}`
            : "/people/employees"
        );
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Employee could not be saved."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="employee-modal-page">

        <div className="employee-modal-backdrop" />

        <div className="employee-modal employee-modal-loading">

          <div className="employee-modal-loader" />

          <span>
            Loading employee form...
          </span>

        </div>

      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="employee-modal-page">

      {/* BACKDROP */}

      <button
        type="button"
        className="employee-modal-backdrop"
        aria-label="Close employee form"
        onClick={
          saving
            ? undefined
            : closeForm
        }
      />


      {/* POPUP */}

      <div
        className="employee-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="employee-modal-header">

          <div className="employee-modal-title-wrap">

            <div className="employee-modal-icon">
              {editing
                ? "✎"
                : "+"}
            </div>

            <div>

              <h2 id="employee-modal-title">
                {editing
                  ? "Edit Employee"
                  : "Add Employee"}
              </h2>

              <p>
                Employee master record
              </p>

            </div>

          </div>


          <button
            type="button"
            className="employee-modal-close"
            onClick={
              closeForm
            }
            disabled={
              saving
            }
            aria-label="Close"
          >
            ×
          </button>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={
            submit
          }
          className="employee-modal-form"
        >

          <div className="employee-modal-body">


            {/* ERROR */}

            {error ? (
              <div
                className="employee-modal-error"
                role="alert"
              >

                <span>
                  !
                </span>

                <div>
                  {error}
                </div>

              </div>
            ) : null}


            {/* =================================================
                PROFILE PHOTO
            ================================================= */}

            <section className="employee-popup-section employee-profile-photo-section">

              <div className="employee-popup-section-title">
                Employee Profile
              </div>

              <div className="employee-profile-photo-wrap">

                <div className="employee-profile-photo-preview">

                  {profilePhotoPreview ? (
                    <img
                      src={
                        profilePhotoPreview
                      }
                      alt={
                        form.fullName
                          ? `${form.fullName} profile`
                          : "Employee profile"
                      }
                    />
                  ) : (
                    <span>
                      {getEmployeeInitials(
                        form.fullName
                      )}
                    </span>
                  )}

                </div>


                <div className="employee-profile-photo-info">

                  <strong>
                    Profile Photo
                  </strong>

                  <p>
                    Add a clear employee photo for the employee directory,
                    reporting hierarchy and profile.
                  </p>

                  <small>
                    JPG, PNG or WebP · Maximum 2 MB
                  </small>


                  <div className="employee-profile-photo-actions">

                    <label className="employee-profile-photo-upload">

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          handleProfilePhotoChange
                        }
                        hidden
                      />

                      {profilePhotoPreview
                        ? "Change Photo"
                        : "Upload Photo"}

                    </label>


                    {profilePhotoPreview ? (
                      <button
                        type="button"
                        className="employee-profile-photo-remove"
                        onClick={
                          handleRemoveProfilePhoto
                        }
                      >
                        Remove
                      </button>
                    ) : null}

                  </div>


                  {profilePhotoFile ? (
                    <div className="employee-profile-photo-selected">

                      <span>
                        ✓
                      </span>

                      <div>

                        <strong>
                          {
                            profilePhotoFile.name
                          }
                        </strong>

                        <small>
                          {(
                            profilePhotoFile.size /
                            1024
                          ).toFixed(0)} KB selected
                        </small>

                      </div>

                    </div>
                  ) : null}

                </div>

              </div>

            </section>


            {/* =================================================
                EMPLOYEE DETAILS
            ================================================= */}

            <section className="employee-popup-section">

              <div className="employee-popup-section-title">
                Employee Details
              </div>


              <div className="employee-popup-grid">


                {/* FULL NAME */}

                <label className="employee-popup-field">

                  <span>
                    Full Name
                    <b>*</b>
                  </span>

                  <input
                    autoFocus
                    type="text"
                    value={
                      form.fullName
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "fullName",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Employee full name"
                    maxLength={120}
                    autoComplete="off"
                  />

                </label>


                {/* COMPANY */}

                <label className="employee-popup-field">

                  <span>
                    Company
                    <b>*</b>
                  </span>

                  <select
                    value={
                      form.companyCode
                    }
                    onChange={
                      handleCompanyChange
                    }
                  >

                    <option value="">
                      Select company
                    </option>

                    {companyOptions.map(
                      (company) => (
                        <option
                          key={
                            company.value
                          }
                          value={
                            company.value
                          }
                        >
                          {
                            company.label
                          }
                        </option>
                      )
                    )}

                  </select>

                </label>


                {/* EMPLOYEE ID */}

                <label className="employee-popup-field">

                  <span>
                    Employee ID
                    <b>*</b>

                    {!editing &&
                    suggestedEmployeeCode ? (
                      <em className="employee-auto-badge">
                        AUTO
                      </em>
                    ) : null}
                  </span>

                  <input
                    type="text"
                    value={
                      form.employeeCode
                    }
                    onChange={(
                      event
                    ) => {
                      setEmployeeCodeEdited(
                        true
                      );

                      update(
                        "employeeCode",
                        event
                          .target
                          .value
                          .toUpperCase()
                      );
                    }}
                    placeholder="Auto generated"
                    maxLength={30}
                    autoComplete="off"
                  />

                </label>


                {/* BIOMETRIC */}

                <label className="employee-popup-field">

                  <span>
                    Biometric ID

                    {!editing &&
                    suggestedEmployeeCode ? (
                      <em className="employee-auto-badge">
                        AUTO
                      </em>
                    ) : null}
                  </span>

                  <input
                    type="text"
                    value={
                      form.biometricCode
                    }
                    onChange={(
                      event
                    ) => {
                      setBiometricCodeEdited(
                        true
                      );

                      update(
                        "biometricCode",
                        event
                          .target
                          .value
                          .toUpperCase()
                      );
                    }}
                    placeholder="Biometric employee code"
                    autoComplete="off"
                  />

                </label>


                {/* MOBILE */}

                <label className="employee-popup-field">

                  <span>
                    Mobile Number
                  </span>

                  <div className="employee-mobile-input">

                    <span>
                      +91
                    </span>

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={
                        form.mobileNumber
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          "mobileNumber",
                          digits(
                            event
                              .target
                              .value,
                            10
                          )
                        )
                      }
                      placeholder="10 digit number"
                      autoComplete="tel"
                    />

                  </div>

                </label>


                {/* OFFICIAL EMAIL */}

                <label className="employee-popup-field">

                  <span>
                    Official Email
                  </span>

                  <input
                    type="email"
                    value={
                      form.officialEmail
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "officialEmail",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="name@company.com"
                    autoComplete="email"
                  />

                </label>


                {/* PERSONAL EMAIL */}

                <label className="employee-popup-field employee-popup-field-wide">

                  <span>
                    Personal Email
                  </span>

                  <input
                    type="email"
                    value={
                      form.personalEmail
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "personalEmail",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Personal email address"
                    autoComplete="off"
                  />

                </label>

              </div>

            </section>


           {/* =================================================
    ORGANISATION
================================================= */}

<section className="employee-popup-section">
  <div className="employee-popup-section-title">
    Organisation
  </div>

  <div className="employee-popup-grid">

    {/* ORGANISATION UNIT */}

    <label className="employee-popup-field">
      <span>
        Organisation Unit
        <b>*</b>
      </span>

      <select
        value={form.orgUnitCode}
        disabled={!form.companyCode}
        onChange={handleOrgUnitChange}
      >
        <option value="">
          {!form.companyCode
            ? "Select company first"
            : "Select organisation unit"}
        </option>

        {orgUnits.map((unit) => {
          const value =
            typeof unit === "string"
              ? unit
              : unit?.code ||
                unit?.value ||
                "";

          const label =
            typeof unit === "string"
              ? prettyValue(unit)
              : unit?.name ||
                unit?.label ||
                prettyValue(value);

          return (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          );
        })}
      </select>

      {!form.companyCode ? (
        <small className="employee-field-note">
          Select company first.
        </small>
      ) : null}
    </label>

    {/* DEPARTMENT */}

   {/* DEPARTMENT */}
<label className="employee-popup-field">
  <span>
    Department
    <b>*</b>
  </span>

  <select
    name="department"
    value={form.department || ""}
    disabled={
      !form.companyCode ||
      !form.orgUnitCode
    }
    onChange={(event) => {
      const value = event.target.value;

      setForm((previous) => ({
        ...previous,
        department: value,
        reportsTo: "",
      }));

      setError("");
    }}
  >
    <option value="">
      {!form.companyCode
        ? "Select company first"
        : !form.orgUnitCode
        ? "Select organisation unit first"
        : "Select department"}
    </option>

    {departments.map((department) => (
      <option
        key={department.value}
        value={department.value}
      >
        {department.name}
      </option>
    ))}
  </select>

  {form.companyCode && !form.orgUnitCode ? (
    <small className="employee-field-note">
      Select organisation unit first.
    </small>
  ) : form.department ? (
    <small className="employee-field-note employee-field-note-success">
      Department selected
    </small>
  ) : null}
</label>

    {/* DESIGNATION */}

    <label className="employee-popup-field">
      <span>
        Designation
        <b>*</b>
      </span>

      <input
        type="text"
        value={form.designation}
        onChange={(event) =>
          update(
            "designation",
            event.target.value
          )
        }
        placeholder="e.g. Sales Executive"
        maxLength={120}
        autoComplete="off"
      />
    </label>

    {/* REPORTING MANAGER */}

    <label className="employee-popup-field">
      <span>
        Reporting Manager
      </span>

      <select
        value={form.reportsTo}
        disabled={
          !form.companyCode ||
          !form.orgUnitCode ||
          !form.department
        }
        onChange={(event) =>
          update(
            "reportsTo",
            event.target.value
          )
        }
      >
        <option value="">
          {!form.companyCode
            ? "Select company first"
            : !form.orgUnitCode
            ? "Select organisation unit first"
            : !form.department
            ? "Select department first"
            : reportingManagers.length === 0
            ? "No reporting manager found"
            : "Select reporting manager"}
        </option>

        {reportingManagers.map(
          (manager) => {
            const id =
              manager?._id ||
              manager?.id;

            const managerDepartment =
              manager?.department?.name ||
              manager?.departmentName ||
              "";

            return (
              <option
                key={id}
                value={id}
              >
                {manager?.fullName}

                {manager?.designation
                  ? ` — ${manager.designation}`
                  : ""}

                {managerDepartment
                  ? ` (${managerDepartment})`
                  : manager?.employeeCode
                  ? ` (${manager.employeeCode})`
                  : ""}
              </option>
            );
          }
        )}
      </select>

      {!form.companyCode ? (
        <small className="employee-field-note">
          Select company first.
        </small>
      ) : !form.orgUnitCode ? (
        <small className="employee-field-note">
          Select organisation unit first.
        </small>
      ) : !form.department ? (
        <small className="employee-field-note">
          Select department first.
        </small>
      ) : reportingManagers.length ===
        0 ? (
        <small className="employee-field-note">
          No reporting manager found for this department hierarchy.
        </small>
      ) : (
        <small className="employee-field-note">
          Showing this department and its upper reporting hierarchy only.
        </small>
      )}
    </label>

  </div>
</section>


            {/* =================================================
                EMPLOYMENT
            ================================================= */}

            <section className="employee-popup-section">

              <div className="employee-popup-section-title">
                Employment
              </div>


              <div className="employee-popup-grid">


                {/* JOINING DATE */}

                <label className="employee-popup-field">

                  <span>
                    Joining Date
                  </span>

                  <input
                    type="date"
                    value={
                      form.joiningDate
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "joiningDate",
                        event
                          .target
                          .value
                      )
                    }
                  />

                </label>


                {/* EMPLOYMENT TYPE */}

                <label className="employee-popup-field">

                  <span>
                    Employment Type
                  </span>

                  <select
                    value={
                      form.employmentType
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "employmentType",
                        event
                          .target
                          .value
                      )
                    }
                  >

                    {employmentTypes.map(
                      (item) => (
                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {
                            prettyValue(
                              item
                            )
                          }
                        </option>
                      )
                    )}

                  </select>

                </label>


                {/* WORK LOCATION */}

                <label className="employee-popup-field">

                  <span>
                    Work Location
                  </span>

                  <input
                    type="text"
                    value={
                      form.workLocation
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "workLocation",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Office / Plant / Location"
                    maxLength={100}
                    autoComplete="off"
                  />

                </label>


                {/* STATUS */}

                <label className="employee-popup-field">

                  <span>
                    Employee Status
                  </span>

                  <select
                    value={
                      form.status
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "status",
                        event
                          .target
                          .value
                      )
                    }
                  >

                    {statuses.map(
                      (item) => (
                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {
                            prettyValue(
                              item
                            )
                          }
                        </option>
                      )
                    )}

                  </select>

                </label>

              </div>

            </section>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="employee-modal-footer">

            <button
              type="button"
              className="employee-popup-cancel"
              onClick={
                closeForm
              }
              disabled={
                saving
              }
            >
              Cancel
            </button>


            <button
              type="submit"
              className="employee-popup-save"
              disabled={
                saving
              }
            >

              {saving ? (
                <>
                  <span className="employee-button-spinner" />
                  Saving...
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                <>
                  Create Employee
                  <span>
                    →
                  </span>
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


export default EmployeeFormPage;