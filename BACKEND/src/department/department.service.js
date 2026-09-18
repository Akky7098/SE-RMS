const mongoose =
  require("mongoose");

const {
  Department,
} =
  require(
    "./department.model"
  );

const {
  DepartmentMembership,
} =
  require(
    "./departmentMembership.model"
  );

const User =
  require(
    "../user/user.model"
  );

const ApiError =
  require(
    "../utils/ApiError"
  );

/* =========================================================
   USER MODEL COMPATIBILITY

   Some projects export:
   module.exports = User

   Others export:
   { User }

   Handle both safely.
========================================================= */

const UserModel =
  User.User ||
  User;

/* =========================================================
   SLUG
========================================================= */

const createSlug =
  (
    value
  ) => {
    return String(
      value ||
        ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /&/g,
        " and "
      )
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  };

/* =========================================================
   COMMON DEPARTMENT ABBREVIATIONS

   This makes codes human-friendly.

   Human Resources → HR
   Quality Assurance → QA
   Information Technology → IT
========================================================= */

const COMMON_CODES = {
  "human resources":
    "HR",

  "human resource":
    "HR",

  hr:
    "HR",

  "quality assurance":
    "QA",

  quality:
    "QA",

  "information technology":
    "IT",

  "information systems":
    "IT",

  accounts:
    "ACCOUNTS",

  finance:
    "FIN",

  dispatch:
    "DISPATCH",

  sales:
    "SALES",

  purchase:
    "PURCHASE",

  procurement:
    "PURCHASE",

  manufacturing:
    "MFG",

  production:
    "PROD",

  management:
    "MGMT",

  administration:
    "ADMIN",

  admin:
    "ADMIN",

  warehouse:
    "WH",

  inventory:
    "INV",
};

/* =========================================================
   GENERATE CODE BASE
========================================================= */

const generateCodeBase =
  (
    name
  ) => {
    const normalized =
      String(
        name ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      COMMON_CODES[
        normalized
      ]
    ) {
      return COMMON_CODES[
        normalized
      ];
    }

    const words =
      normalized
        .replace(
          /[^a-z0-9 ]/g,
          " "
        )
        .split(
          /\s+/
        )
        .filter(
          Boolean
        );

    if (
      words.length >=
        2
    ) {
      return words
        .map(
          (
            word
          ) =>
            word[0]
        )
        .join(
          ""
        )
        .slice(
          0,
          6
        )
        .toUpperCase();
    }

    return String(
      words[0] ||
        "DEPT"
    )
      .replace(
        /[^a-z0-9]/gi,
        ""
      )
      .slice(
        0,
        10
      )
      .toUpperCase();
  };

/* =========================================================
   UNIQUE DEPARTMENT CODE
========================================================= */

const generateUniqueCode =
  async (
    name,
    excludeId =
      null
  ) => {
    const base =
      generateCodeBase(
        name
      ) ||
      "DEPT";

    let candidate =
      base;

    let sequence =
      2;

    while (
      true
    ) {
      const query = {
        code:
          candidate,
      };

      if (
        excludeId
      ) {
        query._id = {
          $ne:
            excludeId,
        };
      }

      const exists =
        await Department
          .exists(
            query
          );

      if (
        !exists
      ) {
        return candidate;
      }

      candidate =
        `${base}-${String(
          sequence
        ).padStart(
          2,
          "0"
        )}`;

      sequence +=
        1;
    }
  };

/* =========================================================
   UNIQUE SLUG
========================================================= */

const generateUniqueSlug =
  async (
    name,
    excludeId =
      null
  ) => {
    const base =
      createSlug(
        name
      ) ||
      "department";

    let candidate =
      base;

    let sequence =
      2;

    while (
      true
    ) {
      const query = {
        slug:
          candidate,
      };

      if (
        excludeId
      ) {
        query._id = {
          $ne:
            excludeId,
        };
      }

      const exists =
        await Department
          .exists(
            query
          );

      if (
        !exists
      ) {
        return candidate;
      }

      candidate =
        `${base}-${sequence}`;

      sequence +=
        1;
    }
  };

/* =========================================================
   GET DEPARTMENT
========================================================= */

const getDepartmentById =
  async (
    departmentId
  ) => {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          departmentId
        )
    ) {
      throw new ApiError(
        400,
        "Invalid department ID"
      );
    }

    const department =
      await Department
        .findById(
          departmentId
        )
        .populate(
          "parentDepartment",
          "name code status"
        )
        .lean();

    if (
      !department
    ) {
      throw new ApiError(
        404,
        "Department not found"
      );
    }

    return department;
  };

/* =========================================================
   VALIDATE PARENT
========================================================= */

const validateParent =
  async (
    parentDepartment,
    currentDepartmentId =
      null
  ) => {
    if (
      !parentDepartment
    ) {
      return null;
    }

    if (
      currentDepartmentId &&
      String(
        parentDepartment
      ) ===
        String(
          currentDepartmentId
        )
    ) {
      throw new ApiError(
        400,
        "A department cannot be its own parent"
      );
    }

    const parent =
      await Department
        .findById(
          parentDepartment
        );

    if (
      !parent
    ) {
      throw new ApiError(
        404,
        "Parent department not found"
      );
    }

    if (
      parent.status ===
        "ARCHIVED"
    ) {
      throw new ApiError(
        400,
        "Archived department cannot be selected as parent"
      );
    }

    /* =====================================================
       PREVENT CIRCULAR HIERARCHY

       Example:

       A → B → C

       Cannot later make:
       A.parent = C
    ===================================================== */

    if (
      currentDepartmentId
    ) {
      let cursor =
        parent;

      const visited =
        new Set();

      while (
        cursor
      ) {
        const cursorId =
          String(
            cursor._id
          );

        if (
          visited.has(
            cursorId
          )
        ) {
          break;
        }

        visited.add(
          cursorId
        );

        if (
          cursorId ===
            String(
              currentDepartmentId
            )
        ) {
          throw new ApiError(
            400,
            "Circular department hierarchy is not allowed"
          );
        }

        if (
          !cursor.parentDepartment
        ) {
          break;
        }

        cursor =
          await Department
            .findById(
              cursor
                .parentDepartment
            )
            .select(
              "_id parentDepartment"
            );
      }
    }

    return parent;
  };

/* =========================================================
   CREATE DEPARTMENT

   Frontend normally sends:

   {
     name: "Human Resources",
     parentDepartment: null
   }

   Backend automatically creates:
   HR
   human-resources
========================================================= */

const createDepartment =
  async ({
    input,
    actorUserId,
  }) => {
    await validateParent(
      input.parentDepartment
    );

    const duplicateName =
      await Department
        .findOne({
          name: {
            $regex:
              `^${input.name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}$`,

            $options:
              "i",
          },

          status: {
            $ne:
              "ARCHIVED",
          },
        })
        .lean();

    if (
      duplicateName
    ) {
      throw new ApiError(
        409,
        "A department with this name already exists"
      );
    }

    const code =
      await generateUniqueCode(
        input.name
      );

    const slug =
      await generateUniqueSlug(
        input.name
      );

    const department =
      await Department
        .create({
          name:
            input.name,

          code,

          slug,

          description:
            input.description ||
            "",

          parentDepartment:
            input.parentDepartment ||
            null,

          displayOrder:
            input.displayOrder ||
            0,

          createdBy:
            actorUserId,

          updatedBy:
            actorUserId,
        });

    return getDepartmentById(
      department._id
    );
  };

/* =========================================================
   LIST DEPARTMENTS
========================================================= */

const listDepartments =
  async ({
    status,
    parentDepartment,
    search,
  } = {}) => {
    const query =
      {};

    if (
      status
    ) {
      query.status =
        String(
          status
        ).toUpperCase();
    } else {
      query.status = {
        $ne:
          "ARCHIVED",
      };
    }

    if (
      parentDepartment
    ) {
      query.parentDepartment =
        parentDepartment;
    }

    if (
      search
    ) {
      const safe =
        String(
          search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      query.$or = [
        {
          name: {
            $regex:
              safe,

            $options:
              "i",
          },
        },

        {
          code: {
            $regex:
              safe,

            $options:
              "i",
          },
        },
      ];
    }

    const departments =
      await Department
        .find(
          query
        )
        .populate(
          "parentDepartment",
          "name code"
        )
        .sort({
          displayOrder:
            1,

          name:
            1,
        })
        .lean();

    /* =====================================================
       MEMBER COUNTS

       Useful in Department UI.
    ===================================================== */

    const departmentIds =
      departments.map(
        (
          department
        ) =>
          department._id
      );

    const counts =
      await DepartmentMembership
        .aggregate([
          {
            $match: {
              department: {
                $in:
                  departmentIds,
              },

              status:
                "ACTIVE",
            },
          },

          {
            $group: {
              _id:
                "$department",

              count: {
                $sum:
                  1,
              },
            },
          },
        ]);

    const countMap =
      new Map(
        counts.map(
          (
            item
          ) => [
            String(
              item._id
            ),

            item.count,
          ]
        )
      );

    return departments.map(
      (
        department
      ) => ({
        ...department,

        memberCount:
          countMap.get(
            String(
              department._id
            )
          ) ||
          0,
      })
    );
  };

/* =========================================================
   UPDATE DEPARTMENT

   If name changes:
   slug updates automatically.

   Code DOES NOT automatically change after creation.

   This is intentional because department codes should
   remain stable once used by ERP records.
========================================================= */

const updateDepartment =
  async ({
    departmentId,
    input,
    actorUserId,
  }) => {
    const department =
      await Department
        .findById(
          departmentId
        );

    if (
      !department
    ) {
      throw new ApiError(
        404,
        "Department not found"
      );
    }

    if (
      input.parentDepartment !==
        undefined
    ) {
      await validateParent(
        input.parentDepartment,
        departmentId
      );

      department.parentDepartment =
        input.parentDepartment ||
        null;
    }

    if (
      input.name !==
        undefined &&
      input.name !==
        department.name
    ) {
      department.name =
        input.name;

      department.slug =
        await generateUniqueSlug(
          input.name,
          departmentId
        );

      /*
       * IMPORTANT:
       *
       * Keep department.code unchanged.
       *
       * Example:
       * Human Resources renamed to People & Culture
       *
       * HR remains HR internally.
       */
    }

    if (
      input.description !==
        undefined
    ) {
      department.description =
        input.description;
    }

    if (
      input.displayOrder !==
        undefined
    ) {
      department.displayOrder =
        input.displayOrder;
    }

    if (
      input.status !==
        undefined
    ) {
      department.status =
        input.status;
    }

    department.updatedBy =
      actorUserId;

    await department.save();

    return getDepartmentById(
      department._id
    );
  };

/* =========================================================
   ARCHIVE DEPARTMENT

   We avoid hard delete because future records may
   reference this department.
========================================================= */

const archiveDepartment =
  async ({
    departmentId,
    actorUserId,
  }) => {
    const department =
      await Department
        .findById(
          departmentId
        );

    if (
      !department
    ) {
      throw new ApiError(
        404,
        "Department not found"
      );
    }

    if (
      department
        .isSystemDepartment
    ) {
      throw new ApiError(
        403,
        "System department cannot be archived"
      );
    }

    const activeChildren =
      await Department
        .countDocuments({
          parentDepartment:
            department._id,

          status: {
            $ne:
              "ARCHIVED",
          },
        });

    if (
      activeChildren >
        0
    ) {
      throw new ApiError(
        400,
        "Move or archive child departments first"
      );
    }

    department.status =
      "ARCHIVED";

    department.updatedBy =
      actorUserId;

    await department.save();

    await DepartmentMembership
      .updateMany(
        {
          department:
            department._id,
        },

        {
          $set: {
            status:
              "INACTIVE",

            updatedBy:
              actorUserId,
          },
        }
      );

    return {
      departmentId:
        department._id,

      status:
        "ARCHIVED",
    };
  };

/* =========================================================
   ADD / UPDATE MEMBER

   Same endpoint can be used when:
   - adding member
   - changing role
   - assigning department admin
========================================================= */

const upsertMembership =
  async ({
    departmentId,
    input,
    actorUserId,
  }) => {
    const department =
      await Department
        .findOne({
          _id:
            departmentId,

          status: {
            $ne:
              "ARCHIVED",
          },
        });

    if (
      !department
    ) {
      throw new ApiError(
        404,
        "Department not found"
      );
    }

    const user =
      await UserModel
        .findById(
          input.user
        )
        .select(
          "_id displayName email status"
        );

    if (
      !user
    ) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    if (
      input.isPrimary
    ) {
      /*
       * Automatically remove previous primary designation.
       *
       * User does not have to manually manage it.
       */
      await DepartmentMembership
        .updateMany(
          {
            user:
              user._id,

            isPrimary:
              true,
          },

          {
            $set: {
              isPrimary:
                false,

              updatedBy:
                actorUserId,
            },
          }
        );
    }

    /* =====================================================
       AUTOMATIC AUTHORITY DEFAULTS
    ===================================================== */

    const canManageMembers =
      [
        "DEPARTMENT_SUPER_ADMIN",
        "HOD",
      ].includes(
        input.role
      );

    const canApproveManpower =
      input.role ===
        "DEPARTMENT_SUPER_ADMIN";

    const membership =
      await DepartmentMembership
        .findOneAndUpdate(
          {
            user:
              user._id,

            department:
              department._id,
          },

          {
            $set: {
              role:
                input.role,

              isPrimary:
                input.isPrimary,

              status:
                "ACTIVE",

              canManageMembers,

              canApproveManpower,

              updatedBy:
                actorUserId,
            },

            $setOnInsert: {
              createdBy:
                actorUserId,
            },
          },

          {
            upsert:
              true,

            runValidators:
              true,

            returnDocument:
              "after",
          }
        )
        .populate(
          "user",
          "displayName email role status"
        )
        .populate(
          "department",
          "name code"
        );

    return membership;
  };

/* =========================================================
   LIST MEMBERS
========================================================= */

const listDepartmentMembers =
  async (
    departmentId
  ) => {
    await getDepartmentById(
      departmentId
    );

    return DepartmentMembership
      .find({
        department:
          departmentId,

        status:
          "ACTIVE",
      })
      .populate(
        "user",
        "displayName email role status employee"
      )
      .sort({
        role:
          1,

        createdAt:
          1,
      })
      .lean();
  };

/* =========================================================
   REMOVE MEMBER

   Soft removal.
========================================================= */

const removeMembership =
  async ({
    departmentId,
    userId,
    actorUserId,
  }) => {
    const membership =
      await DepartmentMembership
        .findOne({
          department:
            departmentId,

          user:
            userId,

          status:
            "ACTIVE",
        });

    if (
      !membership
    ) {
      throw new ApiError(
        404,
        "Department membership not found"
      );
    }

    membership.status =
      "INACTIVE";

    membership.isPrimary =
      false;

    membership.updatedBy =
      actorUserId;

    await membership.save();

    return {
      success:
        true,
    };
  };

/* =========================================================
   GET USER DEPARTMENT ACCESS

   Used by /access/me
========================================================= */

const getUserDepartmentAccess =
  async (
    userId
  ) => {
    const memberships =
      await DepartmentMembership
        .find({
          user:
            userId,

          status:
            "ACTIVE",
        })
        .populate({
          path:
            "department",

          select:
            "name code slug parentDepartment status",

          match: {
            status:
              "ACTIVE",
          },
        })
        .sort({
          isPrimary:
            -1,

          createdAt:
            1,
        })
        .lean();

    return memberships
      .filter(
        (
          membership
        ) =>
          Boolean(
            membership
              .department
          )
      )
      .map(
        (
          membership
        ) => ({
          membershipId:
            membership._id,

          departmentId:
            membership
              .department
              ._id,

          departmentCode:
            membership
              .department
              .code,

          departmentName:
            membership
              .department
              .name,

          parentDepartmentId:
            membership
              .department
              .parentDepartment ||
            null,

          role:
            membership.role,

          isPrimary:
            membership
              .isPrimary,

          canManageMembers:
            membership
              .canManageMembers,

          canApproveManpower:
            membership
              .canApproveManpower,
        })
      );
  };

/* =========================================================
   GET DEPARTMENT SUPER ADMIN

   Important for next Manpower module.
========================================================= */

const getDepartmentApprover =
  async (
    departmentId,
    excludeUserId =
      null
  ) => {
    let current =
      await Department
        .findById(
          departmentId
        )
        .select(
          "_id parentDepartment"
        );

    const visited =
      new Set();

    while (
      current
    ) {
      const currentId =
        String(
          current._id
        );

      if (
        visited.has(
          currentId
        )
      ) {
        break;
      }

      visited.add(
        currentId
      );

      const membershipQuery = {
        department:
          current._id,

        role:
          "DEPARTMENT_SUPER_ADMIN",

        status:
          "ACTIVE",
      };

      if (
        excludeUserId
      ) {
        membershipQuery.user = {
          $ne:
            excludeUserId,
        };
      }

      const approver =
        await DepartmentMembership
          .findOne(
            membershipQuery
          )
          .populate(
            "user",
            "displayName email role status"
          )
          .lean();

      if (
        approver
      ) {
        return {
          sourceDepartment:
            current._id,

          membership:
            approver,
        };
      }

      if (
        !current
          .parentDepartment
      ) {
        break;
      }

      current =
        await Department
          .findById(
            current
              .parentDepartment
          )
          .select(
            "_id parentDepartment"
          );
    }

    return null;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createDepartment,

  listDepartments,

  getDepartmentById,

  updateDepartment,

  archiveDepartment,

  upsertMembership,

  listDepartmentMembers,

  removeMembership,

  getUserDepartmentAccess,

  getDepartmentApprover,

  generateUniqueCode,

  generateUniqueSlug,
};