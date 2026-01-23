## Executive Summary
This project involves the development of an automated stock monitoring system for a specific pet food product on the Mondou e-commerce platform. Due to the product's frequent unavailability and the vendor's reliance on Cloudflare protection, a headless browser solution via GitHub Actions will be implemented to verify shipping status hourly. This data will be transmitted via webhook to an Azure Logic App, which will manage state tracking and trigger email notifications upon status changes. The objective is to ensure dietary continuity for a pet with specific medical needs while maintaining a zero-cost operational model.
### Problem Statement
The required specific diet pet food frequently goes out of stock on the Mondou website. Mondou does not offer a public API for inventory checking, and the website is protected by Cloudflare, preventing standard HTTP monitoring tools from accessing data. Manual monitoring is inefficient and prone to error, leading to potential gaps in the pet's diet.
### Goals & Objectives
#### Goals
Ensure continuous awareness of product availability to secure stock before depletion.
Eliminate manual effort associated with checking product inventory.
#### Objectives
Implement an automated verification process that runs exactly once per hour.
Successfully bypass Cloudflare protection using a headless browser environment.
Send a webhook payload to Azure Logic Apps containing the current shipping status.
Store the previous status and trigger an email notification only when the status changes (e.g., In Stock to Out of Stock).
Achieve all functionality with $0.00 operational cost.
### Scope
#### In Scope
Development of a Playwright/Puppeteer script to scrape Mondou product pages.
Configuration of GitHub Actions for hourly execution (CRON).
Development of an Azure Logic App workflow for state management and email alerting.
Monitoring of one specific product URL.
#### Out of Scope
Automated purchasing or checkout processes.
Monitoring of third-party vendors other than Mondou.
Mobile application development.
### Assumptions & Constraints
#### Assumptions
Mondou's website DOM structure remains relatively stable.
GitHub Actions IP addresses remain unblocked by Mondou's security filters.
Azure Logic Apps and GitHub Actions free tiers remain sufficient for hourly execution.
#### Constraints
Budget: $0.00 (Must utilize free tiers of all services).
Technical: Target site is protected by Cloudflare (requires headless browser).
Frequency: Monitoring must occur hourly.
## PROPOSED APPROACH(ES)
### Option 1: GitHub Actions (Recommended)
Description: A script using Playwright or Puppeteer is committed to a private GitHub repository. GitHub Actions spins up a virtual machine to run the browser, render the page to bypass Cloudflare, check stock, and send a POST request to Azure Logic Apps.
Pros: Robust headless browser support; 2,000 free automation minutes/month is sufficient; effectively bypasses Cloudflare; zero maintenance cost.
Cons: Requires maintaining a script in a repository.
Estimated Effort: Around 1 hour for setup.
Recommendation: Selected as the primary approach due to high reliability in bypassing bot protection and perfect fit for the cost constraint.
### Option 2: Azure Functions (Consumption Plan)
Description: A Python or Node.js function running on Azure's Consumption plan using a Timer Trigger.
Pros: Consolidates all infrastructure within Azure.
Cons: technically complex to configure headless browsers (Chromium) on the Consumption plan; higher maintenance overhead than GitHub Actions.
Estimated Effort: 4 to 6 hours.
### PROJECT PLAN
#### Timeline & Milestones
This project is classified as a personal initiative (hobby project). Development and deployment will proceed on an ad-hoc basis subject to availability. No fixed deadlines or strict milestones are established.
Deliverables
GitHub Repository: Contains the Playwright/Puppeteer scraping script and workflow YAML.
Azure Logic App: Configured workflow with HTTP Webhook trigger, Condition logic, and Outlook/Email connector.
Documentation: Configuration guide for updating the monitored Product URL.
Resource Allocation
### Tools
Source Control & Compute: GitHub (Actions, Repository).
Scripting: Node.js, Playwright or Puppeteer.
Orchestration & Notification: Azure Logic Apps.
Risk Assessment
Risk: Cloudflare updates security rules to block GitHub Actions IP ranges.
Likelihood: Medium.
Impact: High (Service stoppage).
Mitigation: Rotate IP addresses or implement proxy integration (may incur cost).
Risk: Mondou changes website HTML structure.
Likelihood: Medium.
Impact: Medium (Script failure).
Mitigation: Implement error logging in Logic App to notify owner of script failures.
### Acceptance Criteria
The system executes the check every hour (+/- 5 minutes).
The system accurately identifies if an item is "Available to Ship" on the Mondou product page.
The system successfully triggers the Azure Logic App webhook.
The user receives an email only when the status changes.
Total implementation and running cost is $0.