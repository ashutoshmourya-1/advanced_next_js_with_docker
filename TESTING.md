# Feature Testing Guide

This document is the first documentation draft for three implemented features whose unit tests are already present in the repository. The tests use Jest and React Testing Library, with external actions, repositories, routing, and toasts mocked at the feature boundary.

Run the complete test suite with:

```bash
pnpm test
```

## 1. Docker page data rendering

**Implementation:** `src/app/docker/page.tsx`

The Docker page is an async Server Component. It requests user details through `UserRepository`, renders the form trigger and user table when the repository succeeds, and renders an error message without the table when the repository returns a failure.

**Covered by:** `src/app/docker/__tests__/page.test.tsx`

The current unit tests verify:

- successful repository data renders the page heading, Add User button, and user table;
- the table displays the number of returned users;
- `get_user_details` is called once with no arguments;
- repository failures render the error prefix and returned error message;
- the normal page content and user table are absent on failure.

**Behavior contract:** the page owns page-level composition and error branching, while `UserRepository` owns the data-access implementation. A repository failure must not leave stale or misleading user-table content in the rendered result.

## 2. User repository CRUD and validation

**Implementation:** `src/repositories/user_repository.ts`

`UserRepository` provides the user data-access operations used by the UI:

| Operation | Backend request |
| --- | --- |
| `get_user_details` | `GET /user` |
| `insert_user_details` | `POST /user` |
| `update_user_details` | `PATCH /user/:id` |
| `delete_user_details` | `DELETE /user/:id` |

Each response is checked against the API envelope and user schema. The repository returns the project `Result` shape instead of exposing raw Axios responses.

**Covered by:** `src/repositories/__tests__/user_repository.test.ts`

The current unit tests verify:

- each CRUD method uses the expected HTTP method, path, and payload;
- successful responses return `{ ok: true, data }`;
- API responses with `ok: false` become structured error results;
- invalid response envelopes are rejected;
- invalid user data is rejected during schema parsing;
- delete success returns `{ ok: true, data: undefined }`.

**Behavior contract:** components and actions should consume `Result` values and should not need to know Axios or schema-parser details. Changes to an endpoint, response envelope, or user schema should update this test suite first.

## 3. User management form and table actions

**Implementations:**

- `src/components/forms/user_details_form.tsx`
- `src/components/tables/user_details_table.tsx`

The user management UI supports creating users, editing existing users, displaying completion status, and deleting users. Successful mutations close or refresh the relevant UI; failures display an error toast and preserve the form state where applicable.

**Covered by:**

- `src/components/forms/__tests__/user_details_form.test.tsx`
- `src/components/tables/__tests__/user_details_table.test.tsx`

The current unit tests verify:

- create mode renders the form and submits through `insert_user_action` with the default `id: 0`;
- edit mode pre-fills existing values and submits through `update_user_action` with the existing id;
- create and update failures show error toasts and keep the dialog open;
- successful create and update operations close the dialog and refresh the router;
- the table renders headers, one row per user, empty-list behavior, and a fallback for a missing phone number;
- completion flags map to the expected Done and In-Progress badges;
- Edit opens the form with the selected row's data;
- Delete calls `delete_user_action`, shows the correct success or error toast, and refreshes after success.

**Behavior contract:** create and edit are distinct flows. Create must call the insert action, edit must call the update action, and a failed mutation must not silently close the dialog. Table actions must use the row selected by the user.

## Test maintenance guidance

- Keep tests focused on observable behavior and public component boundaries.
- Mock network, router, toast, and action dependencies so unit tests remain deterministic.
- Add a success and failure case when adding a new mutation or backend operation.
- Add a test for empty or invalid data when changing a displayed data shape.
- Run `pnpm test` after changes and use the coverage report to identify untested branches; coverage alone is not a substitute for behavior assertions.