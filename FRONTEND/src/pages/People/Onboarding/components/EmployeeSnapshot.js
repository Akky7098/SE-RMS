import React from "react";

function EmployeeSnapshot({
  employee,
}) {
  const fields = [
    {
      label: "Employee ID",
      value:
        employee?.employeeCode,
    },
    {
      label: "Company",
      value:
        employee?.companyName ||
        employee?.companyCode,
    },
    {
      label: "Department",
      value:
        employee?.departmentName ||
        employee?.orgUnitCode,
    },
    {
      label: "Designation",
      value:
        employee?.designation,
    },
    {
      label: "Reporting Manager",
      value:
        employee?.reportingManagerName,
    },
    {
      label: "Work Location",
      value:
        employee?.workLocation,
    },
  ];

  return (
    <section className="onboarding-employee-snapshot">

      <div className="onboarding-snapshot-heading">

        <div>

          <span>
            EMPLOYEE CREATED
          </span>

          <h2>
            Employee Master Record
          </h2>

        </div>

        <strong className="onboarding-created-check">
          ✓ CREATED
        </strong>

      </div>

      <div className="onboarding-snapshot-grid">

        {fields.map(
          (
            field
          ) => (
            <div
              key={
                field.label
              }
            >
              <span>
                {field.label}
              </span>

              <strong>
                {field.value ||
                  "—"}
              </strong>
            </div>
          )
        )}

      </div>

    </section>
  );
}

export default EmployeeSnapshot;