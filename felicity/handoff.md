# AI Personal Assistant ("Second Brain") – Project Handoff

## Vision

Build an AI-first personal life operating system centered around a conversational AI executive assistant. This is **not** a calendar or productivity app. It is a **second brain** that reduces mental load and helps users manage the complexity of everyday life.

**Core Mission:**

> *"It's like having the world's best personal assistant."*

The assistant should organize information, anticipate needs, remember routines (with permission), and gently help users live healthier, more connected lives.

---

# Target User

Primary audience:

* Busy homeschooling mothers
* Multiple children
* Church involvement
* Volunteer/nonprofit work
* Household management
* Meal planning
* Errands
* Possibly running a business

The user is overwhelmed because they are managing hundreds of moving pieces—not because they lack productivity tools.

---

# Product Philosophy

The assistant should never feel like software.

It should feel like:

* a trusted executive assistant
* warm
* calm
* competent
* hopeful
* organized
* never judgmental

Think:

**Heart:** Lisa Harper

**Mind:** Elite Executive Assistant

---

# Core Principles

## The assistant always...

* Reduces mental load
* Tells the truth
* Encourages without flattery
* Preserves dignity
* Assumes the user is doing their best
* Admits uncertainty
* Learns gradually
* Asks permission before remembering long-term patterns
* Encourages community over isolation
* Protects relationships over productivity
* Leaves the final decision to the user

## The assistant never...

* Shames
* Guilt trips
* Uses hustle culture
* Inflates praise
* Pretends certainty
* Makes major scheduling changes without permission
* Secretly builds permanent memories
* Overwhelms with notifications

---

# MVP

## 1. Brain Dump (Primary Feature)

The Brain Dump is the product.

Everything else exists to support it.

Phone-call style conversation.

User presses microphone.

Conversation stays open.

AI listens continuously.

Only interrupts when clarification is required.

User taps microphone again to end.

AI automatically extracts:

* Tasks
* Appointments
* Shopping Items
* Notes
* Ideas
* Prayer Requests

Returns:

> "Here's what I took care of..."

instead of asking the user to organize everything.

---

## 2. Three Input Methods

### Voice

Primary input.

### Picture Upload

Upload:

* planners
* notebooks
* sticky notes
* whiteboards
* calendars
* bulletins

OCR extracts everything automatically.

### Manual Entry

Quick add:

* task
* appointment
* note
* shopping item

---

# Dashboard

Configurable widget dashboard.

Default layout:

* Good Morning greeting
* Optional Bible Verse
* Today's Big Three
* Today's Appointments
* What's On Fire Today
* Brain Dump button

Users can rearrange, hide, or add widgets.

Possible widgets:

* Bible Verse
* Weather
* Meal Plan
* Prayer List
* Family Snapshot
* Grocery List
* Workout
* Water
* Notes
* Upcoming Appointments

---

# Calendar

Separate:

Appointments ≠ Tasks

Appointments:

* fixed date/time
* protected
* calendar

Tasks:

* flexible
* optional due date
* unscheduled by default
* AI may suggest placement

Views:

* Month
* Week
* Day

---

# Inbox Philosophy

Everything first lands in an Inbox.

AI automatically categorizes into:

* Appointments
* Tasks
* Notes
* Ideas
* Shopping
* Prayer Requests

No guilt.

Never display:

> 428 unfinished tasks

Instead:

> "You have a few unscheduled tasks."

---

# AI Memory

Long-term memory must always be permission based.

Example:

"I've noticed you usually grocery shop Thursdays.

Would you like me to remember this?"

Buttons:

* Yes
* No
* Don't ask again

Memory categories:

* Family
* Church
* Homeschool
* Household
* Shopping
* Meals
* Work
* Business
* Health
* Notifications

Dedicated page:

## What I Know About You

Everything editable.

Everything removable.

---

# AI Scheduling

The assistant should suggest—not control.

Example:

> Thursday looks overloaded.

Would you like me to suggest a better schedule?

Never automatically move appointments.

Tasks can be suggested for rescheduling.

---

# Notifications

Only useful notifications.

Default appointment reminders:

* 1 day before
* 1 hour before

No constant nudging.

No motivational spam.

---

# Future Modules

## Well-being

Optional.

Includes:

* Meal planning
* Workout tracking
* Water reminders
* Medication reminders
* Pet feeding
* Household recurring routines

Not intended to compete with MyFitnessPal.

---

# Community Philosophy

The AI should gently encourage relationships.

Examples:

"You've mentioned Becky several times."

"Would you like to call her?"

"You've been carrying a lot lately."

"Would it help to ask someone from church?"

Technology should move people toward people—not replace them.

---

# Faith

Default app:

Wholesome.

Warm.

Encouraging.

Christian values without requiring Christianity.

Optional Christian Mode:

* Daily Scripture
* Prayer tracking
* Church widgets
* Devotionals
* Scripture integrated naturally

---

# Visual Design

Mood:

Quiet.

Premium.

Warm.

Natural.

Palette:

* Forest Green
* Walnut Wood
* Warm Cream
* Linen texture
* Minimal icons
* Rounded cards
* Lots of whitespace

Avoid looking like enterprise software.

Feels like:

Leather planner + coffee + wood desk.

---

# Data Model

Core entities:

* Users
* Family Members
* Brain Dumps
* Tasks
* Appointments
* Notes
* Ideas
* Shopping Lists
* Prayer Requests
* Projects
* Memories
* Routines
* Notifications
* Dashboard Widgets
* Assistant Preferences

Every item stores:

* source
* confidence
* created by
* AI reasoning
* timestamps

Possible sources:

* Brain Dump
* Manual Entry
* OCR Upload
* AI Conversation

---

# AI Architecture

Multiple specialized agents:

Conversation Agent

Scheduler Agent

Memory Agent

OCR Agent

Planning Agent

Notification Agent

Well-being Agent

The user experiences only one unified assistant.

---

# MVP Roadmap

### Phase 1

Authentication

Database

Dashboard

Theme

Calendar UI

---

### Phase 2

Brain Dump

Voice conversations

AI extraction

Summary screen

---

### Phase 3

Tasks

Appointments

Notifications

---

### Phase 4

OCR

Planner uploads

Handwriting recognition

---

### Phase 5

Memory Engine

"What I Know About You"

Learning permissions

---

### Phase 6

Scheduling suggestions

What's On Fire Today

Daily Briefing

---

### Phase 7

Closed beta

20–50 busy moms

Observe real usage

Iterate on conversation flow before expanding features

---

# North Star

Every design decision should answer one question:

> **"Would the world's best executive assistant do this?"**

If yes, build it.

If not, don't.

The product is not a task manager.

It is not a calendar.

It is not an AI chatbot.

It is **a trusted AI executive assistant that remembers what matters, organizes life's chaos, and gives busy people the feeling that they don't have to carry everything alone.**
