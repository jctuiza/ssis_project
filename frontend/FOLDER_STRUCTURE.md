# Frontend structure

```text
frontend/
├── src
│   ├── api
│   │   ├── apiClient.js
│   │   ├── cache.js
│   │   └── session.js
│   ├── assets
│   │   └── campus.webp
│   ├── components
│   │   ├── account
│   │   │   └── ChangePasswordForm.jsx
│   │   ├── auth
│   │   │   ├── LoginForm.jsx
│   │   │   ├── LoginPhoto.jsx
│   │   │   └── UnderlineInput.jsx
│   │   ├── dashboard
│   │   │   ├── ActivityList.jsx
│   │   │   ├── DocumentDetails.jsx
│   │   │   ├── ResourcePage.jsx
│   │   │   ├── RowList.jsx
│   │   │   ├── StaffDashboard.jsx
│   │   │   └── WorkflowSteps.jsx
│   │   ├── feedback
│   │   │   ├── AsyncView.jsx
│   │   │   ├── ConfirmationDialog.jsx
│   │   │   ├── CredentialsDialog.jsx
│   │   │   └── RouteErrorBoundary.jsx
│   │   ├── forms
│   │   │   ├── Input.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── Select.jsx
│   │   │   └── Toggle.jsx
│   │   ├── layout
│   │   │   ├── Header.jsx
│   │   │   ├── NotificationMenu.jsx
│   │   │   ├── ProfileMenu.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── loading
│   │   │   ├── DashboardSkeleton.jsx
│   │   │   ├── PageSkeleton.jsx
│   │   │   ├── ScreenSkeleton.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   ├── StudentHomeSkeleton.jsx
│   │   │   └── TableSkeleton.jsx
│   │   ├── student
│   │   │   └── StudentIDCard.jsx
│   │   ├── tables
│   │   │   ├── DataTable.jsx
│   │   │   └── Pagination.jsx
│   │   └── ui
│   │       ├── Avatar.jsx
│   │       ├── Breadcrumb.jsx
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── InfoGrid.jsx
│   │       ├── Modal.jsx
│   │       ├── PageHeader.jsx
│   │       ├── StatusBadge.jsx
│   │       └── SummaryCard.jsx
│   ├── config
│   │   ├── constants.js
│   │   ├── navigation.js
│   │   ├── permissions.js
│   │   ├── programs.js
│   │   └── roles.js
│   ├── context
│   │   ├── SessionProvider.jsx
│   │   ├── ToastProvider.jsx
│   │   ├── session.js
│   │   └── toast.js
│   ├── hooks
│   │   ├── useAction.js
│   │   ├── useCachedData.js
│   │   └── useService.js
│   ├── layouts
│   │   └── DashboardLayout.jsx
│   ├── pages
│   │   ├── admin
│   │   │   ├── ActivityLogs.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Announcements.jsx
│   │   │   ├── Departments.jsx
│   │   │   ├── Roles.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── auth
│   │   │   ├── ForcePasswordChange.jsx
│   │   │   └── Login.jsx
│   │   ├── cashier
│   │   │   ├── Assessments.jsx
│   │   │   ├── CashierDashboard.jsx
│   │   │   ├── DocumentFees.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── StudentAccounts.jsx
│   │   │   └── Transactions.jsx
│   │   ├── department
│   │   │   └── DepartmentDashboard.jsx
│   │   ├── registrar
│   │   │   ├── RegistrarDashboard.jsx
│   │   │   ├── RegistrarEnrollment.jsx
│   │   │   └── RegistrarGrades.jsx
│   │   ├── shared
│   │   │   ├── Profile.jsx
│   │   │   ├── RecordsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── StaffClearance.jsx
│   │   │   ├── StaffDocuments.jsx
│   │   │   └── StudentsPage.jsx
│   │   └── student
│   │       ├── StudentClearance.jsx
│   │       ├── StudentDocuments.jsx
│   │       ├── StudentEnrollment.jsx
│   │       ├── StudentGrades.jsx
│   │       ├── StudentHome.jsx
│   │       ├── StudentID.jsx
│   │       └── StudentPayments.jsx
│   ├── routes
│   │   └── AppRoutes.jsx
│   ├── services
│   │   ├── admin
│   │   │   ├── activityService.js
│   │   │   └── adminService.js
│   │   ├── auth
│   │   │   └── authService.js
│   │   ├── cashier
│   │   │   ├── cashierService.js
│   │   │   └── paymentService.js
│   │   ├── department
│   │   │   └── departmentService.js
│   │   ├── registrar
│   │   │   └── registrarService.js
│   │   ├── shared
│   │   │   ├── accountService.js
│   │   │   ├── clearanceService.js
│   │   │   ├── documentService.js
│   │   │   ├── enrollmentService.js
│   │   │   ├── gradeService.js
│   │   │   └── reportService.js
│   │   └── student
│   │       └── studentService.js
│   ├── styles
│   │   └── index.css
│   ├── utils
│   │   ├── format.js
│   │   ├── image.js
│   │   ├── password.js
│   │   ├── styles.js
│   │   └── validation.js
│   ├── App.jsx
│   └── main.jsx
├── tests
│   ├── api.test.mjs
│   └── cache.test.mjs
├── .env.example
├── .gitignore
├── FOLDER_STRUCTURE.md
├── README.md
├── index.html
├── package-lock.json
├── package.json
├── vercel.json
└── vite.config.js
```
