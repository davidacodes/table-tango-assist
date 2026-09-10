# NextTable --- MVP Project Scope

## Product Overview

**NextTable** is an internal restaurant waitlist and table management
application designed primarily for a tablet at the host stand.

Its goal is to give hosts and managers a fast, simple way to manage
walk-in parties, estimate waits, track table availability, and seat
guests.

## Primary Users

-   Restaurant hosts / hostesses
-   Restaurant managers
-   No customer-facing interface in the MVP
-   All staff have the same permissions

## Authentication

-   One shared restaurant login
-   No individual staff accounts or role-based permissions in the MVP

## Primary Device & Interface

-   Tablet-first web application
-   Designed for touch interaction
-   Main screen uses a **split-screen layout**
    -   **Left:** Waitlist
    -   **Right:** Table availability/status
-   An always-visible quick-entry form appears above the waitlist

## Adding a Party

Parties are added manually by restaurant staff.

Required information:

-   Guest name
-   Phone number
-   Party size
-   Arrival time

### Returning Guests

When a phone number matches an existing guest, the application displays
a selectable match such as:

> John Smith --- returning guest

Selecting the guest fills their name for faster entry.

The MVP does not require detailed guest-history features.

## Waitlist

Each active waitlist row displays:

-   Guest name
-   Party size
-   Arrival time
-   Estimated wait
-   Status

### Status Workflow

`Waiting → Notified → Seated / Left / No-show`

When a party is marked:

-   **Seated:** Immediately removed from the active waitlist.
-   **Left:** Immediately removed from the active waitlist.
-   **No-show:** Immediately removed from the active waitlist.

Records may still be retained internally even though they are no longer
shown on the active waitlist.

There is no special overdue highlighting when a guest exceeds the
estimated wait.

## Notifications

For the MVP, notification is manual.

When the host clicks **Notify**:

-   Party status changes to `Notified`
-   Notification time is recorded
-   Staff contact the guest manually

The architecture should allow automatic SMS notifications to be added
later.

## Wait-Time Estimation

Wait times are calculated automatically.

### MVP Formula

`Estimated Wait = Number of Parties Ahead × Default Seating Interval`

Example:

If there are 4 parties ahead and the seating interval is 10 minutes:

`4 × 10 = 40 minute estimated wait`

### Seating Interval

-   The seating interval is manually configured by restaurant
    staff/management.
-   The MVP does not automatically learn or adjust the seating interval.
-   Wait estimates do not account for party size.
-   Changing a party's size after they join the waitlist does **not**
    recalculate their original estimated wait.

## Waitlist Order & Seating

The waitlist is flexible rather than strict FIFO.

Arrival order is visible, but hosts may seat a later party when an
appropriate table becomes available.

The application does **not** automatically highlight compatible waiting
parties when a table becomes available.

The host remains responsible for deciding which party should be seated
next.

## Table Management

Each restaurant table stores:

-   Table number
-   Capacity
-   Status: `Available` or `Occupied`

Occupied tables also display the current party.

Example:

`Table 4 • 4 seats • Occupied • Smith (3)`

### Seating a Party

When the host selects **Seat**:

1.  NextTable finds available tables that can fit the party.
2.  It recommends the **smallest available table that can accommodate
    the party**.
3.  The host sees the recommended table.
4.  The host must confirm the assignment.
5.  The party is removed from the active waitlist.
6.  The selected table becomes `Occupied`.

### Releasing a Table

Tables do not automatically become available.

When guests leave, restaurant staff manually mark the table as
`Available`.

## Editing Parties

After a party has been added:

-   Staff may edit **party size only**.
-   Guest name cannot be edited.
-   Phone number cannot be edited.
-   Changing party size does not change the original estimated wait.

## Table Configuration

NextTable includes a simple settings/configuration screen where staff
can:

-   Add tables
-   Edit tables
-   Remove tables
-   Set table capacities

The restaurant's table configuration is not hard-coded.

## Manager Features

Managers use the same interface and permissions as hosts.

For the MVP:

-   No dedicated analytics dashboard
-   No daily/weekly reporting
-   No peak-period analysis
-   No report exports

The focus is entirely on **live restaurant operations**.

## MVP Core Workflow

`Add Party → Waiting → Notify → Seat → Assign Table → Table Occupied → Manually Mark Table Available`

Alternative exits:

`Waiting / Notified → Left`

`Waiting / Notified → No-show`

## Out of Scope for MVP

The following are intentionally excluded from the initial version:

-   Customer-facing waitlist
-   Remote waitlist joining
-   Reservations
-   Reservation imports
-   Self-service kiosk
-   Automatic SMS notifications
-   Detailed guest profiles/history
-   Wait-time machine learning
-   Historical wait-time calculations
-   Party-size-aware wait estimates
-   Automatic table release
-   Visual restaurant floor plan
-   Automatic selection of which party should be seated next
-   Waitlist overdue alerts
-   Individual employee accounts
-   Role-based permissions
-   Analytics dashboards
-   Reporting and exports

## Potential Future Features

The MVP should leave room for:

-   Automatic SMS notifications
-   Smarter wait-time estimates based on historical data
-   Party-size-aware estimates
-   Customer-facing waitlist status
-   Remote waitlist joining
-   Reservations
-   Detailed guest history/preferences
-   Analytics and reporting
-   Visual floor plans
-   More advanced table recommendations
-   Individual staff accounts and permissions

## Product Principle

NextTable should prioritize **speed and simplicity at a busy host
stand**.

Hosts should be able to quickly answer:

1.  Who is waiting?
2.  How long have they been waiting?
3.  What is their estimated wait?
4.  Which tables are available?
5.  What is the smallest available table that fits the party?
