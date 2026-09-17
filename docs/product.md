# Product

## Weft

Weft is the networking layer for business events.

Its broader purpose is to help valuable connections happen between the right people and to make the networking value created by an event measurable.

This repository does not contain the attendee networking experience itself.

## Current Product: Weft Console

This repository contains the **Weft Console**, the operational and intelligence platform used by:

1. Event organizers
2. Weft staff and Wefters
3. Sponsors and partners

The Console gives each of these roles the information and tools they need before, during, and after an event.

Its purpose is to help them operate the networking experience, understand what is happening across the event, and measure the outcomes created by it.

## Core Problem

Business events generate large amounts of valuable interaction, but organizers, staff, and sponsors often have very little visibility into what is actually happening.

They need to understand things such as:

* who is attending
* which introductions should happen
* which introductions have happened
* which guests need attention
* how staff should coordinate during the event
* whether attendees are achieving their goals
* what value sponsors are receiving
* what networking outcomes the event produced
* how the network evolves across multiple events

The Console turns this activity into something that can be operated, understood, and measured.

## Users

### Event Organizers

Organizers are the primary customers of the Console.

They use it to understand and manage the networking performance of their events and their broader network.

Their experience may include:

* event overview
* attendee participation
* introduction activity
* networking outcomes
* attendee goals and needs
* priority guests
* sponsor performance
* event performance
* post event results
* cross event network insights

The Console should help organizers answer:

> What value is our event creating through the people in the room?

It should prioritize meaningful outcomes over surface level engagement metrics.

### Weft Staff and Wefters

Weft staff use the Console to operate the networking experience during live events.

Their workflows may include:

* viewing introductions that need to happen
* understanding why two attendees should meet
* seeing relevant attendee context
* assigning introductions
* tracking introduction status
* coordinating responsibilities between staff
* marking introductions as completed
* identifying guests requiring attention
* monitoring live event activity

For staff, the Console should behave as an operational tool.

Speed, clarity, prioritization, and situational awareness are more important than deep analytics during the event.

### Sponsors and Partners

Sponsors use the Console to understand the value created through their participation in an event.

Depending on their permissions, their experience may include:

* sponsor goals
* relevant attendees
* relevant introductions
* qualified connections
* outcomes
* follow up opportunities
* sponsor performance
* sponsor reporting

Sponsors should only have access to information relevant to their participation.

They should never automatically receive access to the organizer's complete event, attendee, or network data.

## Product Principles

### Operational clarity

The Console should make the current state of an event easy to understand.

Users should quickly understand what is happening, what needs attention, and what action should happen next.

### Role specific experiences

Organizers, staff, and sponsors have different responsibilities.

Their interfaces, permissions, and information should reflect those differences.

Shared underlying data does not mean every role should see the same product experience.

### Actionable information

The Console should not simply display data.

Information should help users make decisions, coordinate operations, or understand outcomes.

### Outcomes over activity

The Console should prioritize the value created through networking rather than raw activity.

Important signals may include:

* introductions completed
* meaningful connections created
* attendee goals achieved
* opportunities generated
* follow ups created
* sponsor outcomes
* relationships developed across events

Metrics such as page views, scans, clicks, or other interaction counts should remain secondary unless they help explain a meaningful outcome.

### Live event efficiency

Staff workflows should be optimized for environments where users may be moving through a venue, coordinating multiple people, and making decisions quickly.

Important information should be easy to scan and actions should require minimal friction.

### Clear hierarchy

The Console may contain information at multiple levels:

```text
Organization
    ↓
Network
    ↓
Event
    ↓
Attendees / Sponsors / Staff / Introductions
    ↓
Outcomes and Insights
```

The interface should always make it clear which level the user is currently viewing.

### Permission by design

Access control is part of the product itself.

Users should only see the events, attendees, insights, and actions appropriate to their organization, event, and role.

Permissions should not depend solely on hiding interface elements.

### Useful intelligence

Analytics should help users understand what happened and what requires attention.

The goal is not to build dashboards full of charts.

Every metric or insight should answer a useful product or operational question.

## Product Scope

The Console may support capabilities around:

```text
Events
Attendees
Introductions
Sponsors
Staff
Insights
Organizations
```

These represent business capabilities rather than navigation sections.

A single screen may combine information from several capabilities.

## Non Goals

The Weft Console is not:

* the attendee facing networking application
* a social network
* a messaging platform for attendees
* a generic attendee directory
* a swipe based matching experience
* a complete event management platform
* a ticketing platform
* a generic CRM
* an analytics dashboard designed around vanity metrics

The Console exists specifically to help organizers, Weft staff, and sponsors **operate and understand the networking layer of an event**.
