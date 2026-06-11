# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that helps users track personal income and expenses. Users can log transactions with a category, amount, description, and date; view a running balance summary; browse and delete past transactions; and see spending broken down by category in a pie chart. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with LocalStorage for persistence, and is designed to be fully responsive on mobile devices. No external chart libraries are used — the pie chart is rendered with the native Canvas API.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single financial record representing either an income or an expense entry.
- **Income**: A Transaction with a positive monetary value that increases the net balance.
- **Expense**: A Transaction with a negative monetary value that decreases the net balance.
- **Category**: A user-defined or preset label that classifies a Transaction (e.g., Food, Transport, Fun).
- **Transaction_Form**: The HTML form used to create a new Transaction.
- **Transaction_List**: The scrollable list that displays all stored Transactions.
- **Balance_Summary**: The UI component that displays total income, total expenses, and net balance.
- **Pie_Chart**: The canvas-rendered chart that visualizes expense amounts grouped by Category.
- **LocalStorage**: The browser's Web Storage API used to persist Transaction data between sessions.
- **Renderer**: The JavaScript module responsible for updating the DOM whenever application state changes.
- **Validator**: The JavaScript module responsible for checking Transaction_Form input before submission.
- **Theme_Toggle**: The button that switches the UI between light and dark color themes.

---

## Requirements

### Requirement 1: Add Transaction

**User Story:** As a user, I want to add a new income or expense transaction with a category, amount, description, and date, so that I can keep an accurate record of my finances.

#### Acceptance Criteria

1. THE Transaction_Form SHALL contain fields for transaction type (income or expense), item name/description, amount (in Rupiah), category, and date.
2. WHEN the user submits the Transaction_Form with all required fields filled, THE App SHALL create a new Transaction and append it to the stored transaction list.
3. IF the user submits the Transaction_Form with one or more required fields empty, THEN THE Validator SHALL prevent submission and display an inline error message adjacent to each empty field.
4. IF the user enters a non-positive number or a non-numeric value in the amount field, THEN THE Validator SHALL prevent submission and display an error message stating "Amount must be greater than zero."
5. WHEN a Transaction is successfully created, THE Transaction_Form SHALL reset all fields to their default values.
6. WHERE the user enters a non-empty custom category name in the custom-category input field, THE App SHALL use that custom category name as the Transaction's Category, ignoring the preset dropdown value.
7. WHERE the user enters a non-empty custom category name, THE App SHALL add that name as a selectable option in the category dropdown for all subsequent transactions within the same session.
8. WHEN the App initializes, THE App SHALL read all previously used custom categories from LocalStorage and add them as selectable options in the category dropdown before any user interaction.
9. IF the amount field value exceeds 999,999,999.99, THEN THE Validator SHALL prevent submission and display an error message stating the amount exceeds the maximum allowed value.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to view all my transactions in a list and be able to delete any of them, so that I can review and manage my transaction history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction showing its item name, category, type (income/expense), amount formatted using Indonesian locale (e.g., "Rp 1.500.000"), and date formatted as DD/MM/YYYY; the default display order SHALL be newest date first.
2. WHEN the Transaction_List is rendered with zero Transactions, THE Renderer SHALL display an empty-state message (e.g., "No transactions yet.") in place of transaction rows.
3. WHEN the user selects a sort option, THE Transaction_List SHALL re-render the Transactions ordered by the chosen criterion: "Date (Newest)" sorts descending by date, "Amount (Low–High)" sorts ascending by amount, "Amount (High–Low)" sorts descending by amount.
4. WHEN the user clicks the delete button on a Transaction row, THE App SHALL remove that Transaction from LocalStorage and re-render the Transaction_List and Balance_Summary before the next user interaction is possible.
5. IF LocalStorage fails to update during a delete operation, THE App SHALL display an inline error notification and restore the deleted Transaction to the in-memory list and Transaction_List display.
6. WHEN the user enters a positive numeric value in the highlight-limit input, THE Transaction_List SHALL apply a distinct background color to every Transaction row whose amount is greater than or equal to that value.
7. IF the user clears or enters a non-positive value in the highlight-limit input, THE Transaction_List SHALL remove the background highlight from all Transaction rows.
8. THE Transaction_List SHALL render the amount of income Transactions in green text and the amount of expense Transactions in red text.

---

### Requirement 3: Balance Summary

**User Story:** As a user, I want to see my total income, total expenses, and net balance displayed prominently, so that I can immediately understand my financial position.

#### Acceptance Criteria

1. THE Balance_Summary SHALL display three labeled values: total income (sum of all income Transactions), total expenses (sum of all expense Transactions), and net balance (total income minus total expenses).
2. WHEN a Transaction is added, edited, or deleted, THE Renderer SHALL recalculate and update all three Balance_Summary values without requiring a page reload.
3. WHEN the net balance is a negative number, THE Balance_Summary SHALL render the net balance value in a color that is visually distinct from the color used when the net balance is zero or positive.
4. WHEN the net balance is zero or positive, THE Balance_Summary SHALL render the net balance value in a color that is visually distinct from the color used when the net balance is negative.
5. THE Balance_Summary SHALL format all monetary values using Indonesian locale formatting: whole-number amounts are displayed without decimal places (e.g., "Rp 1.500.000"), and amounts with fractional cents are displayed with exactly two decimal places separated by a comma (e.g., "Rp 1.500.000,50").
6. WHEN no Transactions exist, THE Balance_Summary SHALL display all three values as "Rp 0".

---

### Requirement 4: Pie Chart by Category

**User Story:** As a user, I want to see a pie chart showing my spending broken down by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render using the native HTML Canvas API without importing or referencing any external chart library.
2. WHEN there are one or more expense Transactions, THE Pie_Chart SHALL render each Category as a filled arc (pie slice) whose central angle is proportional to that Category's share of total expense amount, where the sum of all arc angles equals 2π radians and each arc angle equals (category total / grand total) × 2π radians.
3. WHEN a Transaction is added or deleted, THE Renderer SHALL clear and redraw the Pie_Chart canvas within 300 milliseconds to reflect the updated Category totals.
4. THE Pie_Chart SHALL assign a distinct fill color to each Category, chosen from a predefined set of at least 8 visually distinguishable colors, such that the same Category always receives the same color across redraws within the same session.
5. THE Pie_Chart SHALL display a legend listing each Category's color swatch, name, and percentage share of total expenses, where each percentage is rounded to one decimal place and the displayed percentages sum to 100.0% after rounding adjustment.
6. WHEN there are zero expense Transactions, THE Pie_Chart SHALL display the text "No expense data to display" horizontally and vertically centered within the canvas area and SHALL NOT render any arc or legend entry.
7. THE Pie_Chart SHALL only aggregate expense Transactions; income Transactions SHALL NOT contribute to any slice angle, Category total, or legend percentage calculation.
8. IF a single Category accounts for 100% of total expenses, THEN THE Pie_Chart SHALL render that Category as a complete filled circle spanning 2π radians.
9. IF two or more Transactions belong to the same Category, THEN THE Pie_Chart SHALL aggregate their amounts into a single slice for that Category.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is still available when I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is created or deleted, THE App SHALL serialize the updated in-memory transaction list to LocalStorage under the key "ebv_transactions" as a JSON string within 200ms of the operation being triggered, before the operation is considered complete.
2. WHEN the App initializes, THE App SHALL deserialize the value stored under "ebv_transactions" in LocalStorage and restore the full UI state (Transaction_List, Balance_Summary, and Pie_Chart) before processing any user input events.
3. IF LocalStorage deserialization fails due to a JSON parse error, or because one or more required Transaction fields (id, itemName, amount, type, category, date, createdAt) are absent, or because any field value does not conform to its defined type and range, THEN THE App SHALL initialize with an empty transaction list and log an error message indicating the failure reason to the browser console.
4. THE App SHALL store each Transaction as a JSON object containing exactly the fields: id (string UUID), itemName (string, 1–100 characters), amount (number, 0.01–999,999,999.99), type (one of: "income" or "expense"), category (non-empty string, 1–50 characters), date (ISO 8601 date string), and createdAt (ISO 8601 datetime string), and SHALL reject any Transaction that does not conform to these constraints by treating it as invalid during deserialization.
5. WHEN a Transaction is created or deleted and LocalStorage write throws any error including a storage quota exceeded error or an access denied error, THE App SHALL display an inline error notification indicating that the data could not be saved, and SHALL retain the in-memory transaction list without modification.
6. WHEN the App initializes and no value is stored under "ebv_transactions" in LocalStorage, THE App SHALL initialize with an empty transaction list and render the Transaction_List, Balance_Summary, and Pie_Chart in their default empty states.

---

### Requirement 6: Theme Toggle

**User Story:** As a user, I want to switch between light and dark color themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the user clicks the Theme_Toggle button, THE App SHALL immediately switch the active color theme from light to dark or from dark to light without requiring a page reload.
2. WHEN the theme is changed, THE App SHALL persist the selected theme value ("light" or "dark") to LocalStorage under the key "theme".
3. WHEN the App initializes and a valid theme value ("light" or "dark") is found in LocalStorage under the key "theme", THE App SHALL apply that theme before rendering any UI element.
4. WHEN the App initializes and no valid theme value is found in LocalStorage, THE App SHALL apply the light theme as the default before rendering any UI element.
5. IF LocalStorage is unavailable or the stored theme value is not "light" or "dark", THEN THE App SHALL apply the light theme as the default and continue rendering without error.
6. THE Theme_Toggle button SHALL display the label "🌙 Dark Mode" when the light theme is active, and "☀️ Light Mode" when the dark theme is active.

---

### Requirement 7: Responsive Layout

**User Story:** As a user, I want the app to work well on both mobile and desktop screens, so that I can use it on any device.

#### Acceptance Criteria

1. THE App SHALL render a single-column layout on viewport widths below 600px.
2. THE App SHALL render a layout of at least 2 columns for the Transaction_Form on viewport widths of 600px and above.
3. THE Transaction_List SHALL support vertical scrolling when the number of displayed Transactions exceeds the visible area, without hiding or collapsing the page header or navigation elements.
4. THE Pie_Chart SHALL scale responsively to fit within its container on any supported viewport width, without overflowing its container boundaries or altering its aspect ratio.
5. THE App SHALL render all interactive elements with a minimum tap target size of 44×44px and all text at a minimum font size of 12px on a 375px-wide mobile viewport.
