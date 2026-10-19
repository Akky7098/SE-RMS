import React, { lazy, Suspense } from "react";

const EmployeeList = lazy(() => import("../People/Employees/app/EmployeesApp"));
const Onboarding = lazy(() => import("../People/Onboarding/OnboardingListPage"));
const Attendance = lazy(() => import("../People/Attendance/app/AttendanceApp"));
const Leave = lazy(() => import("../People/Leave/app/LeaveApp"));
const Shifts = lazy(() => import("../People/Attendance/Shift/app/ShiftApp"));
const Payroll = lazy(() => import("../People/Payroll/app/PayrollApp"));
const ManpowerApp = lazy(() => import("../Recruitment/Manpower/app/ManpowerApp"));
const HiringQueueApp = lazy(() => import("../Recruitment/Hiring/app/HiringQueueApp"));
const MyHiringApp = lazy(() => import("../Recruitment/Hiring/app/MyHiringApp"));
const CandidatesApp = lazy(() => import("../Recruitment/Candidates/app/CandidatesApp"));
const CandidateDetailApp = lazy(() => import("../Recruitment/Candidates/app/CandidateDetailApp"));
const InterviewsApp = lazy(() => import("../Recruitment/Interviews/app/InterviewsApp"));
const InterviewDetailApp = lazy(() => import("../Recruitment/Interviews/app/InterviewDetailApp"));
const EvaluationsApp = lazy(() => import("../Recruitment/Evaluations/app/EvaluationsApp"));
const EvaluationDetailApp = lazy(() => import("../Recruitment/Evaluations/app/EvaluationDetailApp"));
const SelectionsApp = lazy(() => import("../Recruitment/Selection/app/SelectionsApp"));
const SelectionDetailApp = lazy(() => import("../Recruitment/Selection/app/SelectionDetailApp"));
const Recruitment = lazy(() => import("../Recruitment/RecruitmentWorkspace"));

const peopleScreens = {
  employees: EmployeeList,
  onboarding: Onboarding,
  attendance: Attendance,
  leave: Leave,
  shifts: Shifts,
  payroll: Payroll,
};

class WorkspaceBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="se-app-dashboard__empty" role="alert">
          <h2>This page could not load.</h2>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const recruitmentScreens = {
  manpower: ManpowerApp,
  hiring: HiringQueueApp,
  "my-hiring": MyHiringApp,
  candidates: CandidatesApp,
  candidate: CandidateDetailApp,
  interviews: InterviewsApp,
  interview: InterviewDetailApp,
  evaluations: EvaluationsApp,
  evaluation: EvaluationDetailApp,
  selections: SelectionsApp,
  selection: SelectionDetailApp,
};

export default function DashboardAppWorkspace({ app, page, search }) {
  const Screen = app === "RECRUITMENT"
    ? recruitmentScreens[page] || Recruitment
    : peopleScreens[page];

  if (!Screen) {
    return <p className="se-app-dashboard__empty">This page is unavailable.</p>;
  }

  return (
    <WorkspaceBoundary key={`${app}:${page}`}>
      <Suspense fallback={<p className="se-app-dashboard__empty" role="status">Loading workspace…</p>}>
        <Screen search={search} />
      </Suspense>
    </WorkspaceBoundary>
  );
}
