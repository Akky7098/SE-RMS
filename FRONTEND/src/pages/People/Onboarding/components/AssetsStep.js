import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import OnboardingStepCard from "./OnboardingStepCard";

import {
  cancelEmployeeAsset,
  createEmployeeAsset,
  generateAssetHandover,
  getEmployeeAssetMeta,
  getEmployeeAssets,
  markNoAssetRequired,
  uploadAssetAcknowledgement,
} from "../../../../services/employeeAssetService";

import {
  openEmployeeDocument,
} from "../../../../services/employeeDocumentService";

/* =========================================================
   DEFAULT OPTIONS

   Backend meta remains source of truth.
========================================================= */

const FALLBACK_TYPES = [
  "LAPTOP",
  "DESKTOP",
  "MOBILE",
  "SIM",
  "TABLET",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
  "ACCESS_CARD",
  "ID_CARD",
  "VEHICLE",
  "TOOL",
  "OTHER",
];

const FALLBACK_CONDITIONS = [
  "NEW",
  "GOOD",
  "USED",
  "FAIR",
  "DAMAGED",
];

/* =========================================================
   HELPERS
========================================================= */

const todayValue =
  () => {
    const date =
      new Date();

    const offset =
      date.getTimezoneOffset();

    return new Date(
      date.getTime() -
      offset *
        60 *
        1000
    )
      .toISOString()
      .slice(
        0,
        10
      );
  };

const prettify =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
      );

const formatDate =
  (
    value
  ) => {
    if (
      !value
    ) {
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

    return date
      .toLocaleDateString(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",
        }
      );
  };

/* =========================================================
   ASSET TYPE CONFIG

   The form changes according to asset type.
========================================================= */

const getAssetFieldConfig =
  (
    assetType
  ) => {
    switch (
      String(
        assetType ||
        ""
      ).toUpperCase()
    ) {
      case "LAPTOP":
        return {
          title:
            "Laptop",

          nameLabel:
            "Laptop Name",

          namePlaceholder:
            "Dell Latitude 5450",

          codeLabel:
            "System / Asset ID",

          codePlaceholder:
            "LAP-0042",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Laptop serial number",

          showManufacturer:
            true,

          showModel:
            true,

          accessories: [
            "Charger",
            "Laptop Bag",
            "Mouse",
            "Adapter",
          ],
        };

      case "DESKTOP":
        return {
          title:
            "Desktop",

          nameLabel:
            "System Name",

          namePlaceholder:
            "Accounts Desktop 01",

          codeLabel:
            "System / Asset ID",

          codePlaceholder:
            "DESK-0012",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "CPU serial number",

          showManufacturer:
            true,

          showModel:
            true,

          accessories: [
            "Keyboard",
            "Mouse",
            "Monitor",
            "UPS",
          ],
        };

      case "MOBILE":
        return {
          title:
            "Mobile Phone",

          nameLabel:
            "Phone Name",

          namePlaceholder:
            "Samsung Galaxy A55",

          codeLabel:
            "Mobile / Asset ID",

          codePlaceholder:
            "MOB-0012",

          serialLabel:
            "IMEI / Serial Number",

          serialPlaceholder:
            "IMEI or serial number",

          showManufacturer:
            true,

          showModel:
            true,

          accessories: [
            "Charger",
            "Cover",
            "Adapter",
          ],
        };

      case "SIM":
        return {
          title:
            "SIM Card",

          nameLabel:
            "SIM / Provider Name",

          namePlaceholder:
            "Airtel",

          codeLabel:
            "Mobile Number",

          codePlaceholder:
            "9812345678",

          serialLabel:
            "SIM Serial / ICCID",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            false,

          showModel:
            false,

          accessories:
            [],
        };

      case "TABLET":
        return {
          title:
            "Tablet",

          nameLabel:
            "Tablet Name",

          namePlaceholder:
            "Samsung Galaxy Tab",

          codeLabel:
            "Asset ID",

          codePlaceholder:
            "TAB-001",

          serialLabel:
            "Serial / IMEI",

          serialPlaceholder:
            "Serial or IMEI",

          showManufacturer:
            true,

          showModel:
            true,

          accessories: [
            "Charger",
            "Cover",
            "Keyboard",
          ],
        };

      case "MONITOR":
        return {
          title:
            "Monitor",

          nameLabel:
            "Monitor Name",

          namePlaceholder:
            "Dell 24 Inch Monitor",

          codeLabel:
            "Monitor / Asset ID",

          codePlaceholder:
            "MON-001",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Monitor serial number",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [
              "Power Cable",
              "HDMI Cable",
              "Display Cable",
            ],
        };

      case "ACCESS_CARD":
        return {
          title:
            "Access Card",

          nameLabel:
            "Access Card Name",

          namePlaceholder:
            "Office Access Card",

          codeLabel:
            "Access Card ID",

          codePlaceholder:
            "AC-1045",

          serialLabel:
            "Card Serial",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            false,

          showModel:
            false,

          accessories:
            [],
        };

      case "ID_CARD":
        return {
          title:
            "Employee ID Card",

          nameLabel:
            "Card Name",

          namePlaceholder:
            "Employee ID Card",

          codeLabel:
            "Employee / Card ID",

          codePlaceholder:
            "SDP-001",

          serialLabel:
            "Card Reference",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            false,

          showModel:
            false,

          accessories:
            [],
        };

      case "KEYBOARD":
        return {
          title:
            "Keyboard",

          nameLabel:
            "Keyboard Name",

          namePlaceholder:
            "Logitech Keyboard",

          codeLabel:
            "Asset ID",

          codePlaceholder:
            "KEY-001",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [],
        };

      case "MOUSE":
        return {
          title:
            "Mouse",

          nameLabel:
            "Mouse Name",

          namePlaceholder:
            "Logitech Wireless Mouse",

          codeLabel:
            "Asset ID",

          codePlaceholder:
            "MOU-001",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [],
        };

      case "HEADSET":
        return {
          title:
            "Headset",

          nameLabel:
            "Headset Name",

          namePlaceholder:
            "Jabra Headset",

          codeLabel:
            "Asset ID",

          codePlaceholder:
            "HEAD-001",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [],
        };

      case "VEHICLE":
        return {
          title:
            "Vehicle",

          nameLabel:
            "Vehicle Name",

          namePlaceholder:
            "Company Car",

          codeLabel:
            "Registration Number",

          codePlaceholder:
            "HR-51-AB-1234",

          serialLabel:
            "Chassis / Reference Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [
              "Key",
              "RC Copy",
              "Fuel Card",
            ],
        };

      case "TOOL":
        return {
          title:
            "Tool / Equipment",

          nameLabel:
            "Tool Name",

          namePlaceholder:
            "Inspection Tool",

          codeLabel:
            "Tool / Asset ID",

          codePlaceholder:
            "TOOL-001",

          serialLabel:
            "Serial Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [],
        };

      default:
        return {
          title:
            "Other Asset",

          nameLabel:
            "Asset Name",

          namePlaceholder:
            "Enter asset name",

          codeLabel:
            "Asset / Inventory ID",

          codePlaceholder:
            "Asset ID",

          serialLabel:
            "Serial / Reference Number",

          serialPlaceholder:
            "Optional",

          showManufacturer:
            true,

          showModel:
            true,

          accessories:
            [],
        };
    }
  };

/* =========================================================
   BLANK ASSET

   Each asset is one card in the form.
========================================================= */

const createBlankAsset =
  (
    assetType =
      "LAPTOP"
  ) => ({
    assetType,

    assetName:
      "",

    assetCode:
      "",

    serialNumber:
      "",

    manufacturer:
      "",

    model:
      "",

    issueDate:
      todayValue(),

    conditionAtIssue:
      "GOOD",

    estimatedValue:
      "",

    currency:
      "INR",

    remarks:
      "",

    accessories:
      [],
  });

/* =========================================================
   COMPONENT
========================================================= */

function AssetsStep({
  employee: parentEmployee,
  onboarding,
  onChanged,
}) {
  const {
    employeeId,
  } =
    useParams();

  /* =======================================================
     DATA
  ======================================================= */

  const [
    employee,
    setEmployee,
  ] =
    useState(
      parentEmployee ||
      null
    );

  const [
    assets,
    setAssets,
  ] =
    useState(
      []
    );

  const [
    meta,
    setMeta,
  ] =
    useState({
      assetTypes:
        FALLBACK_TYPES,

      conditions:
        FALLBACK_CONDITIONS,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  /* =======================================================
     ASSIGN MODAL
  ======================================================= */

  const [
    assignOpen,
    setAssignOpen,
  ] =
    useState(
      false
    );

  const [
    assetForms,
    setAssetForms,
  ] =
    useState([
      createBlankAsset(),
    ]);

  /* =======================================================
     NO ASSET MODAL
  ======================================================= */

  const [
    noAssetOpen,
    setNoAssetOpen,
  ] =
    useState(
      false
    );

  const [
    noAssetRemarks,
    setNoAssetRemarks,
  ] =
    useState(
      ""
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    async () => {
      if (
        !employeeId
      ) {
        return;
      }

      setLoading(
        true
      );

      setError(
        ""
      );

      try {
        const [
          metaResult,
          assetResult,
        ] =
          await Promise.all([
            getEmployeeAssetMeta(),

            getEmployeeAssets(
              employeeId
            ),
          ]);

        setMeta({
          assetTypes:
            Array.isArray(
              metaResult?.assetTypes
            ) &&
            metaResult
              .assetTypes
              .length
              ? metaResult.assetTypes
              : FALLBACK_TYPES,

          conditions:
            Array.isArray(
              metaResult?.conditions
            ) &&
            metaResult
              .conditions
              .length
              ? metaResult.conditions
              : FALLBACK_CONDITIONS,
        });

        setAssets(
          Array.isArray(
            assetResult?.assets
          )
            ? assetResult.assets
            : []
        );

        if (
          assetResult?.employee
        ) {
          setEmployee(
            assetResult.employee
          );
        }
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Asset information could not be loaded."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(
    () => {
      load();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      employeeId,
    ]
  );

  useEffect(
    () => {
      if (
        parentEmployee
      ) {
        setEmployee(
          parentEmployee
        );
      }
    },
    [
      parentEmployee,
    ]
  );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const activeAssets =
    useMemo(
      () =>
        assets.filter(
          (
            asset
          ) =>
            ![
              "RETURNED",
              "CANCELLED",
            ].includes(
              String(
                asset?.status ||
                ""
              ).toUpperCase()
            )
        ),
      [
        assets,
      ]
    );

  const acknowledged =
    activeAssets.filter(
      (
        asset
      ) =>
        String(
          asset?.status ||
          ""
        ).toUpperCase() ===
        "ACKNOWLEDGED"
    ).length;

  const pending =
    activeAssets.filter(
      (
        asset
      ) =>
        String(
          asset?.status ||
          ""
        ).toUpperCase() !==
        "ACKNOWLEDGED"
    ).length;

  const assetsComplete =
    Boolean(
      onboarding
        ?.checklist
        ?.assets
    );

  const cardStatus =
    assetsComplete
      ? "COMPLETED"
      : activeAssets.length
        ? "IN_PROGRESS"
        : "READY";

  /* =======================================================
     OPEN ASSIGN MODAL
  ======================================================= */

  const openAssignModal =
    () => {
      setError(
        ""
      );

      setAssetForms([
        createBlankAsset(),
      ]);

      setAssignOpen(
        true
      );
    };

  /* =======================================================
     UPDATE ONE ASSET CARD
  ======================================================= */

  const updateAssetForm =
    (
      index,
      field,
      value
    ) => {
      setAssetForms(
        (
          previous
        ) =>
          previous.map(
            (
              asset,
              assetIndex
            ) =>
              assetIndex ===
              index
                ? {
                    ...asset,

                    [
                      field
                    ]:
                      value,
                  }
                : asset
          )
      );
    };

  /* =======================================================
     CHANGE ASSET TYPE

     Reset type-specific fields so old Laptop values don't
     incorrectly remain after switching to SIM, etc.
  ======================================================= */

  const changeAssetType =
    (
      index,
      nextType
    ) => {
      setAssetForms(
        (
          previous
        ) =>
          previous.map(
            (
              asset,
              assetIndex
            ) => {
              if (
                assetIndex !==
                index
              ) {
                return asset;
              }

              return {
                ...createBlankAsset(
                  nextType
                ),

                issueDate:
                  asset.issueDate ||
                  todayValue(),

                conditionAtIssue:
                  asset.conditionAtIssue ||
                  "GOOD",
              };
            }
          )
      );
    };

  /* =======================================================
     ADD ANOTHER ASSET
  ======================================================= */

  const addAssetForm =
    () => {
      setAssetForms(
        (
          previous
        ) => [
          ...previous,

          createBlankAsset(),
        ]
      );
    };

  /* =======================================================
     REMOVE ASSET CARD
  ======================================================= */

  const removeAssetForm =
    (
      index
    ) => {
      setAssetForms(
        (
          previous
        ) => {
          if (
            previous.length <=
            1
          ) {
            return previous;
          }

          return previous.filter(
            (
              _,
              assetIndex
            ) =>
              assetIndex !==
              index
          );
        }
      );
    };

  /* =======================================================
     ACCESSORY
  ======================================================= */

  const accessorySelected =
    (
      asset,
      name
    ) =>
      Array.isArray(
        asset?.accessories
      ) &&
      asset.accessories.some(
        (
          accessory
        ) =>
          accessory?.name ===
          name &&
          accessory?.included !==
            false
      );

  const toggleAccessory =
    (
      index,
      name
    ) => {
      setAssetForms(
        (
          previous
        ) =>
          previous.map(
            (
              asset,
              assetIndex
            ) => {
              if (
                assetIndex !==
                index
              ) {
                return asset;
              }

              const accessories =
                Array.isArray(
                  asset.accessories
                )
                  ? asset.accessories
                  : [];

              const exists =
                accessories.some(
                  (
                    accessory
                  ) =>
                    accessory?.name ===
                    name
                );

              if (
                exists
              ) {
                return {
                  ...asset,

                  accessories:
                    accessories.filter(
                      (
                        accessory
                      ) =>
                        accessory?.name !==
                        name
                    ),
                };
              }

              return {
                ...asset,

                accessories: [
                  ...accessories,

                  {
                    name,

                    included:
                      true,

                    remarks:
                      "",
                  },
                ],
              };
            }
          )
      );
    };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateAssets =
    () => {
      for (
        let index = 0;
        index <
        assetForms.length;
        index +=
          1
      ) {
        const asset =
          assetForms[
            index
          ];

        const config =
          getAssetFieldConfig(
            asset.assetType
          );

        if (
          !String(
            asset.assetName ||
            ""
          ).trim()
        ) {
          throw new Error(
            `${config.nameLabel} is required for asset ${index + 1}.`
          );
        }

        if (
          !asset.issueDate
        ) {
          throw new Error(
            `Issue date is required for asset ${index + 1}.`
          );
        }
      }
    };

  /* =======================================================
     CREATE ALL ASSETS

     Backend supports one asset per POST.
     Frontend submits each card sequentially.
  ======================================================= */

  const handleCreateAssets =
    async () => {
      try {
        validateAssets();
      } catch (
        validationError
      ) {
        setError(
          validationError.message
        );

        return;
      }

      setBusy(
        "CREATE"
      );

      setError(
        ""
      );

      try {
        for (
          const asset
          of assetForms
        ) {
          await createEmployeeAsset(
            employeeId,
            {
              ...asset,

              assetName:
                String(
                  asset.assetName ||
                  ""
                ).trim(),

              assetCode:
                String(
                  asset.assetCode ||
                  ""
                ).trim(),

              serialNumber:
                String(
                  asset.serialNumber ||
                  ""
                ).trim(),

              manufacturer:
                String(
                  asset.manufacturer ||
                  ""
                ).trim(),

              model:
                String(
                  asset.model ||
                  ""
                ).trim(),

              remarks:
                String(
                  asset.remarks ||
                  ""
                ).trim(),

              estimatedValue:
                asset.estimatedValue ===
                  ""
                  ? null
                  : Number(
                      asset.estimatedValue
                    ),
            }
          );
        }

        setAssignOpen(
          false
        );

        setAssetForms([
          createBlankAsset(),
        ]);

        await load();

        await onChanged?.();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Assets could not be assigned."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =======================================================
     GENERATE HANDOVER
  ======================================================= */

  const handleGenerateHandover =
    async (
      asset
    ) => {
      const assetId =
        asset?._id ||
        asset?.id;

      if (
        !assetId
      ) {
        return;
      }

      setBusy(
        `HANDOVER_${assetId}`
      );

      setError(
        ""
      );

      try {
        const updated =
          await generateAssetHandover(
            employeeId,
            assetId
          );

        const documentId =
          updated
            ?.handoverDocument
            ?._id ||
          updated
            ?.handoverDocument;

        await load();

        if (
          documentId
        ) {
          await openEmployeeDocument(
            employeeId,
            documentId
          );
        }

        await onChanged?.();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Handover form could not be generated."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =======================================================
     OPEN HANDOVER
  ======================================================= */

  const handleOpenHandover =
    async (
      asset
    ) => {
      const documentId =
        asset
          ?.handoverDocument
          ?._id ||
        asset
          ?.handoverDocument;

      if (
        !documentId
      ) {
        return;
      }

      try {
        await openEmployeeDocument(
          employeeId,
          documentId
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Handover document could not be opened."
        );
      }
    };

  /* =======================================================
     ACKNOWLEDGEMENT
  ======================================================= */

  const handleAcknowledgement =
    async (
      asset,
      file
    ) => {
      const assetId =
        asset?._id ||
        asset?.id;

      if (
        !assetId ||
        !file
      ) {
        return;
      }

      setBusy(
        `ACK_${assetId}`
      );

      setError(
        ""
      );

      try {
        await uploadAssetAcknowledgement(
          employeeId,
          assetId,
          file
        );

        await load();

        await onChanged?.();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Signed acknowledgement could not be uploaded."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =======================================================
     CANCEL
  ======================================================= */

  const handleCancel =
    async (
      asset
    ) => {
      const assetId =
        asset?._id ||
        asset?.id;

      if (
        !assetId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Cancel asset assignment "${asset.assetName}"?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setBusy(
        `CANCEL_${assetId}`
      );

      setError(
        ""
      );

      try {
        await cancelEmployeeAsset(
          employeeId,
          assetId,
          "Cancelled during onboarding."
        );

        await load();

        await onChanged?.();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "Asset assignment could not be cancelled."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =======================================================
     NO ASSET
  ======================================================= */

  const handleNoAsset =
    async () => {
      setBusy(
        "NO_ASSET"
      );

      setError(
        ""
      );

      try {
        await markNoAssetRequired(
          employeeId,
          noAssetRemarks
        );

        setNoAssetOpen(
          false
        );

        setNoAssetRemarks(
          ""
        );

        await load();

        await onChanged?.();
      } catch (
        requestError
      ) {
        setError(
          requestError?.message ||
          "No Asset Required could not be confirmed."
        );
      } finally {
        setBusy(
          ""
        );
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <OnboardingStepCard
        number="04"
        title="Employee Assets"
        description="Assign company property, generate handover forms and retain signed acknowledgements."
        status={
          cardStatus
        }
      >

        <div className="onboarding-assets-step">

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="onboarding-mini-grid">

            <div className="onboarding-mini-card">

              <span>
                ACTIVE ASSETS
              </span>

              <strong>
                {activeAssets.length}
              </strong>

              <small>
                Current assignments
              </small>

            </div>

            <div className="onboarding-mini-card">

              <span>
                ACKNOWLEDGED
              </span>

              <strong>
                {acknowledged}
              </strong>

              <small>
                Signed by employee
              </small>

            </div>

            <div className="onboarding-mini-card">

              <span>
                PENDING
              </span>

              <strong>
                {pending}
              </strong>

              <small>
                Handover formalities
              </small>

            </div>

          </div>

          {/* =================================================
              REGISTER
          ================================================= */}

          <div className="onboarding-record-panel">

            <div className="onboarding-record-panel-header">

              <div>

                <span className="onboarding-step-eyebrow">
                  ASSET REGISTER
                </span>

                <h4>
                  Assigned Assets
                </h4>

                <p>
                  Laptop, phone, SIM, cards, tools
                  and other company property.
                </p>

              </div>

              <button
                type="button"
                className="onboarding-primary-button"
                onClick={
                  openAssignModal
                }
              >
                + Assign Asset
              </button>

            </div>

            {error &&
            !assignOpen ? (
              <div className="onboarding-assets-error">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="onboarding-empty-state onboarding-asset-empty">

                <strong>
                  Loading assets...
                </strong>

              </div>
            ) : assets.length ===
              0 ? (
              <div className="onboarding-empty-state onboarding-asset-empty">

                <div className="onboarding-empty-icon">
                  A
                </div>

                <strong>
                  No assets assigned
                </strong>

                <span>
                  Add company property using
                  the Assign Asset button.
                </span>

              </div>
            ) : (
              <div className="onboarding-asset-list">

                {assets.map(
                  (
                    asset,
                    index
                  ) => {
                    const assetId =
                      asset?._id ||
                      asset?.id;

                    const status =
                      String(
                        asset?.status ||
                        "DRAFT"
                      ).toUpperCase();

                    const cancelled =
                      status ===
                      "CANCELLED";

                    const acknowledgedAsset =
                      status ===
                      "ACKNOWLEDGED";

                    const handoverDocument =
                      asset
                        ?.handoverDocument
                        ?._id ||
                      asset
                        ?.handoverDocument;

                    return (
                      <div
                        className={[
                          "onboarding-asset-item",

                          cancelled
                            ? "is-cancelled"
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )}
                        key={
                          assetId ||
                          index
                        }
                      >

                        <div className="onboarding-asset-item-top">

                          <div className="onboarding-record-number">
                            {String(
                              index +
                              1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div className="onboarding-asset-main">

                            <span>
                              {prettify(
                                asset.assetType
                              )}
                            </span>

                            <strong>
                              {asset.assetName}
                            </strong>

                            <small>
                              {asset.assignmentNumber}
                            </small>

                          </div>

                          <span
                            className={`onboarding-asset-status is-${status.toLowerCase()}`}
                          >
                            {prettify(
                              status
                            )}
                          </span>

                        </div>

                        <div className="onboarding-asset-details">

                          <div>

                            <span>
                              ASSET / SYSTEM ID
                            </span>

                            <strong>
                              {asset.assetCode ||
                              "—"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              SERIAL / REFERENCE
                            </span>

                            <strong>
                              {asset.serialNumber ||
                              "—"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              MAKE / MODEL
                            </span>

                            <strong>
                              {[
                                asset.manufacturer,
                                asset.model,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                ) ||
                              "—"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              ISSUE DATE
                            </span>

                            <strong>
                              {formatDate(
                                asset.issueDate
                              )}
                            </strong>

                          </div>

                          <div>

                            <span>
                              CONDITION
                            </span>

                            <strong>
                              {prettify(
                                asset.conditionAtIssue
                              )}
                            </strong>

                          </div>

                        </div>

                        {Array.isArray(
                          asset.accessories
                        ) &&
                        asset
                          .accessories
                          .length ? (
                          <div className="onboarding-asset-accessories">

                            <span>
                              INCLUDED WITH ASSET
                            </span>

                            <div>

                              {asset.accessories.map(
                                (
                                  accessory,
                                  accessoryIndex
                                ) => (
                                  <span
                                    key={`${assetId}-${accessoryIndex}`}
                                  >
                                    {accessory.name}
                                  </span>
                                )
                              )}

                            </div>

                          </div>
                        ) : null}

                        {!cancelled ? (
                          <div className="onboarding-asset-actions">

                            {!handoverDocument ? (
                              <button
                                type="button"
                                className="onboarding-secondary-button"
                                disabled={
                                  busy ===
                                  `HANDOVER_${assetId}`
                                }
                                onClick={() =>
                                  handleGenerateHandover(
                                    asset
                                  )
                                }
                              >
                                {busy ===
                                `HANDOVER_${assetId}`
                                  ? "Generating..."
                                  : "Generate Handover"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="onboarding-secondary-button"
                                onClick={() =>
                                  handleOpenHandover(
                                    asset
                                  )
                                }
                              >
                                View Handover
                              </button>
                            )}

                            {!acknowledgedAsset ? (
                              <label className="onboarding-asset-upload-ack">

                                {busy ===
                                `ACK_${assetId}`
                                  ? "Uploading..."
                                  : "Upload Signed Copy"}

                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                  disabled={
                                    busy ===
                                    `ACK_${assetId}`
                                  }
                                  onChange={(
                                    event
                                  ) => {
                                    const file =
                                      event
                                        .target
                                        .files?.[0];

                                    if (
                                      file
                                    ) {
                                      handleAcknowledgement(
                                        asset,
                                        file
                                      );
                                    }

                                    event.target.value =
                                      "";
                                  }}
                                />

                              </label>
                            ) : (
                              <span className="onboarding-asset-complete">
                                ✓ Acknowledged
                              </span>
                            )}

                            {!acknowledgedAsset ? (
                              <button
                                type="button"
                                className="onboarding-asset-cancel-button"
                                disabled={
                                  busy ===
                                  `CANCEL_${assetId}`
                                }
                                onClick={() =>
                                  handleCancel(
                                    asset
                                  )
                                }
                              >
                                Cancel
                              </button>
                            ) : null}

                          </div>
                        ) : null}

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* =================================================
              NO ASSET
          ================================================= */}

          {activeAssets.length ===
          0 ? (
            <div className="onboarding-no-asset-panel">

              <div>

                <strong>
                  No company asset required?
                </strong>

                <span>
                  Complete this step when the employee
                  does not require company property.
                </span>

              </div>

              <button
                type="button"
                className="onboarding-secondary-button"
                onClick={() =>
                  setNoAssetOpen(
                    true
                  )
                }
              >
                Mark No Asset Required
              </button>

            </div>
          ) : null}

        </div>

      </OnboardingStepCard>

      {/* ===================================================
          MULTI-ASSET ASSIGNMENT MODAL
      =================================================== */}

      {assignOpen ? (
        <div className="employee-asset-modal-backdrop">

          <div className="employee-asset-modal employee-asset-modal--multi">

            {/* =============================================
                HEADER
            ============================================= */}

            <div className="employee-asset-modal-header">

              <div>

                <span>
                  COMPANY PROPERTY
                </span>

                <h3>
                  Assign Company Assets
                </h3>

                <p>
                  Add all company property issued to{" "}
                  <strong>
                    {employee?.fullName ||
                    "this employee"}
                  </strong>
                  .
                </p>

              </div>

              <button
                type="button"
                disabled={
                  busy ===
                  "CREATE"
                }
                onClick={() =>
                  setAssignOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            {/* =============================================
                EMPLOYEE STRIP
            ============================================= */}

            <div className="employee-asset-assignee-strip">

              <div>

                <span>
                  EMPLOYEE
                </span>

                <strong>
                  {employee?.fullName ||
                  "Employee"}
                </strong>

              </div>

              <div>

                <span>
                  EMPLOYEE ID
                </span>

                <strong>
                  {employee?.employeeCode ||
                  "—"}
                </strong>

              </div>

              <div>

                <span>
                  ASSETS TO ASSIGN
                </span>

                <strong>
                  {assetForms.length}
                </strong>

              </div>

            </div>

            {/* =============================================
                BODY
            ============================================= */}

            <div className="employee-asset-modal-body employee-asset-multi-body">

              {assetForms.map(
                (
                  asset,
                  index
                ) => {
                  const config =
                    getAssetFieldConfig(
                      asset.assetType
                    );

                  return (
                    <div
                      className="employee-asset-entry-card"
                      key={
                        index
                      }
                    >

                      {/* ===================================
                          CARD HEADER
                      =================================== */}

                      <div className="employee-asset-entry-header">

                        <div>

                          <div className="employee-asset-entry-number">
                            {String(
                              index +
                              1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div>

                            <span>
                              ASSET
                            </span>

                            <strong>
                              {config.title}
                            </strong>

                          </div>

                        </div>

                        {assetForms.length >
                        1 ? (
                          <button
                            type="button"
                            className="employee-asset-remove-entry"
                            disabled={
                              busy ===
                              "CREATE"
                            }
                            onClick={() =>
                              removeAssetForm(
                                index
                              )
                            }
                          >
                            Remove
                          </button>
                        ) : null}

                      </div>

                      {/* ===================================
                          FORM
                      =================================== */}

                      <div className="employee-asset-entry-body">

                        <div className="employee-asset-form-grid">

                          {/* ASSET TYPE */}

                          <div className="employee-asset-field">

                            <label>
                              Asset Type *
                            </label>

                            <select
                              value={
                                asset.assetType
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              onChange={(
                                event
                              ) =>
                                changeAssetType(
                                  index,
                                  event.target
                                    .value
                                )
                              }
                            >
                              {meta.assetTypes.map(
                                (
                                  value
                                ) => (
                                  <option
                                    value={
                                      value
                                    }
                                    key={
                                      value
                                    }
                                  >
                                    {prettify(
                                      value
                                    )}
                                  </option>
                                )
                              )}
                            </select>

                          </div>

                          {/* NAME */}

                          <div className="employee-asset-field">

                            <label>
                              {config.nameLabel} *
                            </label>

                            <input
                              value={
                                asset.assetName
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              placeholder={
                                config.namePlaceholder
                              }
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "assetName",
                                  event.target
                                    .value
                                )
                              }
                            />

                          </div>

                          {/* ASSET CODE */}

                          <div className="employee-asset-field">

                            <label>
                              {config.codeLabel}
                            </label>

                            <input
                              value={
                                asset.assetCode
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              placeholder={
                                config.codePlaceholder
                              }
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "assetCode",
                                  event.target
                                    .value
                                )
                              }
                            />

                          </div>

                          {/* SERIAL */}

                          <div className="employee-asset-field">

                            <label>
                              {config.serialLabel}
                            </label>

                            <input
                              value={
                                asset.serialNumber
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              placeholder={
                                config.serialPlaceholder
                              }
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "serialNumber",
                                  event.target
                                    .value
                                )
                              }
                            />

                          </div>

                          {/* MANUFACTURER */}

                          {config.showManufacturer ? (
                            <div className="employee-asset-field">

                              <label>
                                Manufacturer
                              </label>

                              <input
                                value={
                                  asset.manufacturer
                                }
                                disabled={
                                  busy ===
                                  "CREATE"
                                }
                                placeholder="Example: Dell"
                                onChange={(
                                  event
                                ) =>
                                  updateAssetForm(
                                    index,
                                    "manufacturer",
                                    event.target
                                      .value
                                  )
                                }
                              />

                            </div>
                          ) : null}

                          {/* MODEL */}

                          {config.showModel ? (
                            <div className="employee-asset-field">

                              <label>
                                Model
                              </label>

                              <input
                                value={
                                  asset.model
                                }
                                disabled={
                                  busy ===
                                  "CREATE"
                                }
                                placeholder="Model"
                                onChange={(
                                  event
                                ) =>
                                  updateAssetForm(
                                    index,
                                    "model",
                                    event.target
                                      .value
                                  )
                                }
                              />

                            </div>
                          ) : null}

                          {/* ISSUE DATE */}

                          <div className="employee-asset-field">

                            <label>
                              Issue Date *
                            </label>

                            <input
                              type="date"
                              value={
                                asset.issueDate
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "issueDate",
                                  event.target
                                    .value
                                )
                              }
                            />

                          </div>

                          {/* CONDITION */}

                          <div className="employee-asset-field">

                            <label>
                              Condition *
                            </label>

                            <select
                              value={
                                asset.conditionAtIssue
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "conditionAtIssue",
                                  event.target
                                    .value
                                )
                              }
                            >
                              {meta.conditions.map(
                                (
                                  value
                                ) => (
                                  <option
                                    value={
                                      value
                                    }
                                    key={
                                      value
                                    }
                                  >
                                    {prettify(
                                      value
                                    )}
                                  </option>
                                )
                              )}
                            </select>

                          </div>

                          {/* ACCESSORIES */}

                          {config.accessories.length ? (
                            <div className="employee-asset-field employee-asset-field--wide">

                              <label>
                                Included With This Asset
                              </label>

                              <div className="employee-asset-accessory-options">

                                {config.accessories.map(
                                  (
                                    name
                                  ) => (
                                    <label
                                      key={
                                        name
                                      }
                                    >

                                      <input
                                        type="checkbox"
                                        checked={
                                          accessorySelected(
                                            asset,
                                            name
                                          )
                                        }
                                        disabled={
                                          busy ===
                                          "CREATE"
                                        }
                                        onChange={() =>
                                          toggleAccessory(
                                            index,
                                            name
                                          )
                                        }
                                      />

                                      <span>
                                        {name}
                                      </span>

                                    </label>
                                  )
                                )}

                              </div>

                            </div>
                          ) : null}

                          {/* REMARKS */}

                          <div className="employee-asset-field employee-asset-field--wide">

                            <label>
                              Remarks
                            </label>

                            <textarea
                              rows="2"
                              value={
                                asset.remarks
                              }
                              disabled={
                                busy ===
                                "CREATE"
                              }
                              placeholder="Optional asset issue notes..."
                              onChange={(
                                event
                              ) =>
                                updateAssetForm(
                                  index,
                                  "remarks",
                                  event.target
                                    .value
                                )
                              }
                            />

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

              {/* =============================================
                  ADD ANOTHER
              ============================================= */}

              <button
                type="button"
                className="employee-asset-add-another"
                disabled={
                  busy ===
                  "CREATE"
                }
                onClick={
                  addAssetForm
                }
              >

                <span>
                  +
                </span>

                <div>

                  <strong>
                    Add Another Asset
                  </strong>

                  <small>
                    Laptop, phone, SIM, ID card,
                    access card or any company property
                  </small>

                </div>

              </button>

              {error ? (
                <div className="onboarding-assets-error employee-asset-modal-error">
                  {error}
                </div>
              ) : null}

            </div>

            {/* =============================================
                FOOTER
            ============================================= */}

            <div className="employee-asset-modal-footer employee-asset-multi-footer">

              <div>

                <span>
                  ASSIGNMENT
                </span>

                <strong>
                  {assetForms.length}{" "}
                  {assetForms.length ===
                  1
                    ? "asset"
                    : "assets"}
                </strong>

              </div>

              <div>

                <button
                  type="button"
                  className="onboarding-secondary-button"
                  disabled={
                    busy ===
                    "CREATE"
                  }
                  onClick={() =>
                    setAssignOpen(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="onboarding-primary-button"
                  disabled={
                    busy ===
                    "CREATE"
                  }
                  onClick={
                    handleCreateAssets
                  }
                >
                  {busy ===
                  "CREATE"
                    ? "Assigning Assets..."
                    : `Assign ${assetForms.length} ${
                        assetForms.length ===
                        1
                          ? "Asset"
                          : "Assets"
                      }`}
                </button>

              </div>

            </div>

          </div>

        </div>
      ) : null}

      {/* ===================================================
          NO ASSET MODAL
      =================================================== */}

      {noAssetOpen ? (
        <div className="employee-asset-modal-backdrop">

          <div className="employee-asset-modal employee-asset-modal--small">

            <div className="employee-asset-modal-header">

              <div>

                <span>
                  STEP 04
                </span>

                <h3>
                  No Asset Required
                </h3>

                <p>
                  Confirm that no company property is
                  required for this employee.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setNoAssetOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="employee-asset-modal-body">

              <div className="employee-asset-field">

                <label>
                  Remarks
                </label>

                <textarea
                  rows="4"
                  value={
                    noAssetRemarks
                  }
                  placeholder="Optional reason..."
                  onChange={(
                    event
                  ) =>
                    setNoAssetRemarks(
                      event.target
                        .value
                    )
                  }
                />

              </div>

            </div>

            <div className="employee-asset-modal-footer">

              <button
                type="button"
                className="onboarding-secondary-button"
                onClick={() =>
                  setNoAssetOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="onboarding-primary-button"
                onClick={
                  handleNoAsset
                }
                disabled={
                  busy ===
                  "NO_ASSET"
                }
              >
                {busy ===
                "NO_ASSET"
                  ? "Saving..."
                  : "Confirm No Asset"}
              </button>

            </div>

          </div>

        </div>
      ) : null}
    </>
  );
}

export default AssetsStep;