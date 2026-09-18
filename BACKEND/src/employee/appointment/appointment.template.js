const escapeHtml =
  (
    value
  ) =>
    String(
      value ??
        ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

/* =========================================================
   DATE
========================================================= */

const formatDate =
  (
    value
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        date
      );
  };

/* =========================================================
   TEMPLATE

   SIMPLE PLACEHOLDER ONLY.

   Replace this later with approved legal Appointment Letter.
========================================================= */

const buildAppointmentHtml =
  ({
    employee,
    appointment,
  }) => {
    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">

<style>
@page {
  size: A4;
  margin: 18mm;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  color: #222;
  font-size: 12px;
  line-height: 1.7;
}

.header {
  border-bottom: 2px solid #e30613;
  padding-bottom: 14px;
  margin-bottom: 30px;
}

.company {
  color: #e30613;
  font-size: 14px;
  font-weight: 700;
}

.title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
}

.meta {
  margin-top: 12px;
  color: #666;
}

.row {
  margin-bottom: 12px;
}

.label {
  display: inline-block;
  width: 170px;
  font-weight: 700;
}

.content {
  margin-top: 30px;
}

.signature {
  margin-top: 70px;
}

.signature-line {
  width: 190px;
  border-top: 1px solid #333;
  margin-top: 55px;
  padding-top: 6px;
}
</style>
</head>

<body>

<div class="header">

  <div class="company">
    SANDEEP EDGETECH
  </div>

  <div class="title">
    Appointment Letter
  </div>

  <div class="meta">
    Reference:
    ${escapeHtml(
      appointment
        .referenceNumber
    )}
    <br>

    Date:
    ${escapeHtml(
      formatDate(
        appointment
          .issueDate
      )
    )}
  </div>

</div>

<div class="row">
  <span class="label">
    Employee Name
  </span>

  ${escapeHtml(
    employee
      .fullName
  )}
</div>

<div class="row">
  <span class="label">
    Employee ID
  </span>

  ${escapeHtml(
    employee
      .employeeCode
  )}
</div>

<div class="row">
  <span class="label">
    Designation
  </span>

  ${escapeHtml(
    employee
      .designation
  )}
</div>

<div class="row">
  <span class="label">
    Department
  </span>

  ${escapeHtml(
    employee
      ?.department
      ?.name ||
    employee
      .orgUnitCode
  )}
</div>

<div class="row">
  <span class="label">
    Joining Date
  </span>

  ${escapeHtml(
    formatDate(
      employee
        .joiningDate
    )
  )}
</div>

<div class="row">
  <span class="label">
    Work Location
  </span>

  ${escapeHtml(
    employee
      .workLocation ||
    "—"
  )}
</div>

<div class="row">
  <span class="label">
    Reporting Manager
  </span>

  ${escapeHtml(
    employee
      ?.reportsTo
      ?.fullName ||
    "—"
  )}
</div>

<div class="content">

  <p>
    Dear ${escapeHtml(
      employee
        .fullName
    )},
  </p>

  <p>
    We are pleased to confirm your appointment with
    Sandeep Edgetech as
    <strong>
      ${escapeHtml(
        employee
          .designation
      )}
    </strong>.
  </p>

  <p>
    Your appointment is effective from
    <strong>
      ${escapeHtml(
        formatDate(
          employee
            .joiningDate
        )
      )}
    </strong>.
  </p>

  <p>
    The detailed terms and conditions of employment will
    be governed by the approved company employment policies
    and the final legal Appointment Letter format.
  </p>

  <p>
    We wish you a successful journey with the organisation.
  </p>

</div>

<div class="signature">

  <div class="signature-line">
    Authorized Signatory
    <br>
    Sandeep Edgetech
  </div>

</div>

</body>
</html>
`;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildAppointmentHtml,
};