/*
Add this import inside src/routes/AppRoutes.js

import AttendancePage from "../pages/Attendance/AttendancePage";

Then add this protected route together with your existing
Dashboard / Employee protected routes:

<Route
  path="/attendance"
  element={
    <ProtectedRoute>
      <AttendancePage />
    </ProtectedRoute>
  }
/>

Do NOT create another auth middleware.
Frontend protection stays through your existing ProtectedRoute.
*/
