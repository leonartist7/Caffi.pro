# Caffi.pro - Master Specification

**Version**: 1.0
**Date**: 2025-11-19
**Status**: Phase 4 & 5 Complete (~50% of vision)

---

## 🎯 Product Vision

**Caffi.pro empowers independent coffee shop owners to compete with chains by providing a white-label mobile ordering and loyalty platform without technical knowledge or massive upfront investment.**

**In one sentence**:
_"Shopify for coffee shops - launch your branded mobile ordering app in 24 hours, not 6 months."_

---

## 👥 Target Users

### 1. Leon (Platform Owner)

**Role**: SaaS operator
**Needs**:

- Manage all tenants from single dashboard
- Monitor platform health and revenue
- Onboard new coffee shops efficiently
- Scale infrastructure as tenants grow

**Value**: Recurring revenue from tenant subscriptions

---

### 2. Café Owners (Tenants)

**Role**: Coffee shop business owners
**Needs**:

- Branded mobile ordering app (custom domain, logo, colors)
- Menu management (items, categories, modifiers)
- Order management (real-time notifications, status tracking)
- Customer loyalty program (points, rewards, tiers)
- Staff management (roles, permissions, locations)
- Inventory tracking (stock levels, usage, alerts)
- Analytics and reports (sales, popular items, trends)

**Value**:

- Increased revenue (24/7 ordering, higher average order value)
- Customer retention (loyalty program)
- Operational efficiency (staff portal, inventory management)
- Brand differentiation (custom branding)

---

### 3. End Customers

**Role**: Coffee shop patrons
**Needs**:

- Browse menu easily (categories, search, images)
- Customize orders (sizes, milk types, addons)
- Save favorites and order history
- Earn loyalty points on purchases
- Redeem rewards (free items, discounts)
- Track order status in real-time
- Skip lines with mobile pickup

**Value**:

- Convenience (order ahead, skip queue)
- Personalization (saved preferences, favorites)
- Rewards (loyalty points, exclusive offers)
- Transparency (real-time order tracking)

---

## 💎 Core Value Propositions

### For Café Owners

1. **Launch in 24 hours**: No development required
2. **White-label branding**: Custom domain, logo, colors
3. **Affordable**: Fraction of custom app cost
4. **Increase revenue**: 24/7 ordering, higher AOV with modifiers
5. **Customer retention**: Built-in loyalty program
6. **Operational efficiency**: Staff portal, inventory management
7. **Data insights**: Analytics on sales, trends, customer behavior

### For Customers

1. **Convenience**: Order ahead, skip queues
2. **Personalization**: Save favorites, dietary preferences
3. **Rewards**: Earn points, redeem free items
4. **Transparency**: Real-time order tracking
5. **Speed**: Faster checkout than in-store

### For Leon (Platform Owner)

1. **Recurring revenue**: Monthly subscriptions per tenant
2. **Scalability**: Serve hundreds of coffee shops from single platform
3. **Market opportunity**: $50B+ specialty coffee market
4. **Defensibility**: High switching costs (customer data, loyalty programs)

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│               Caffi.pro Platform                          │
│           (Multi-Tenant SaaS Architecture)                │
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌──────▼───────┐
│ Admin Portal │  │ Customer Shop │  │ Staff Portal │
│ (Dashboard)  │  │ /shop/[slug]  │  │   /staff/*   │
│              │  │ (White-label) │  │              │
│ - Tenants    │  │ - Menu        │  │ - Kitchen    │
│ - Locations  │  │ - Cart        │  │   Dashboard  │
│ - Menu       │  │ - Checkout    │  │ - Orders     │
│ - Orders     │  │ - Orders      │  │ - Inventory  │
│ - Coupons    │  │ - Loyalty     │  │ - Team       │
│ - Rewards    │  │ - Profile     │  │ - Reports    │
│ - Analytics  │  │               │  │              │
└──────────────┘  └───────────────┘  └──────────────┘
                          │
                   ┌──────┴──────┐
                   │  Middleware │
                   │ (Routing &  │
                   │  Multi-tenant)│
                   └──────┬──────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
│    Supabase    │ │   Storage   │ │   Realtime     │
│   PostgreSQL   │ │ (Images/    │ │ (Orders/       │
│   (18 tables)  │ │  Files)     │ │  Notifications)│
│   + RLS        │ │             │ │                │
└────────────────┘ └─────────────┘ └────────────────┘
```

---

## 🎯 Feature Hierarchy

### P0 (Must Have - Core Business) ✅ COMPLETE

#### 1. Multi-Tenant Foundation ✅

- [x] Tenant management (create, configure, branding)
- [x] Custom slug URLs (`app.caffi.pro/shop/cafe-name`)
- [x] Custom domain support (`www.cafe-name.com`)
- [x] White-label branding (logo, colors, app name)
- [x] Row-Level Security (tenant data isolation)

**Status**: ✅ 100% Complete

---

#### 2. Menu Management ✅

- [x] Categories (create, reorder, activate/deactivate)
- [x] Menu items (name, description, price, image)
- [x] Modifiers (sizes, milk types, toppings, addons)
- [x] Allergen tags
- [x] Location-specific availability
- [x] Active/inactive items

**Status**: ✅ 100% Complete

---

#### 3. Customer Ordering Flow ✅

- [x] Browse menu (categories, search)
- [x] Item customization (modifiers)
- [x] Shopping cart (add, remove, edit, persist)
- [x] Customer authentication (signup, login)
- [x] Checkout (location selection, special instructions)
- [x] Order placement
- [x] Order confirmation
- [x] Order tracking (real-time status updates)

**Status**: ✅ 100% Complete

---

#### 4. Order Management ✅

- [x] Admin order view (all orders across tenants)
- [x] Staff kitchen dashboard (real-time queue)
- [x] Order status workflow (pending → confirmed → preparing → ready → completed)
- [x] Order assignment to staff
- [x] Real-time updates (Supabase Realtime)
- [x] Sound notifications (new orders)
- [x] Search and filter orders

**Status**: ✅ 100% Complete

---

#### 5. Loyalty Program ✅

- [x] Points earning (configurable per € spent)
- [x] Signup bonus points
- [x] Tier system (bronze, silver, gold, platinum)
- [x] Tier multipliers (1x, 1.25x, 1.5x, 2x)
- [x] Rewards catalog (discounts, free items)
- [x] Rewards redemption
- [x] Transaction history
- [x] Points balance display

**Status**: ✅ 100% Complete

---

#### 6. Staff Operations Portal ✅

- [x] Staff authentication (roles, permissions)
- [x] Kitchen dashboard (real-time orders)
- [x] Order status updates
- [x] Inventory management (items, transactions, low stock alerts)
- [x] Team management (add staff, assign roles/locations)
- [x] Reports & analytics (sales, trends, top items)

**Status**: ✅ 100% Complete

---

### P1 (Should Have - Competitive) 🔴 NOT STARTED

#### 7. Payment Integration 🔴

- [ ] Stripe integration (card payments)
- [ ] Apple Pay support
- [ ] Google Pay support
- [ ] Payment intent creation
- [ ] Webhook handling (payment confirmation)
- [ ] Refund processing

**Status**: ❌ 0% Complete
**Priority**: 🔴 Critical for production launch
**Estimated Effort**: 2-3 weeks

---

#### 8. Communication & Notifications 🔴

- [ ] Email notifications (order confirmations, receipts)
- [ ] SMS notifications (order ready)
- [ ] Push notifications (order status updates)
- [ ] SendGrid/Resend integration
- [ ] Twilio integration
- [ ] Notification preferences

**Status**: ❌ 0% Complete
**Priority**: 🔴 Critical for UX
**Estimated Effort**: 2 weeks

---

#### 9. Delivery Integration 🔴

- [ ] Delivery address collection
- [ ] Google Maps integration (location picker)
- [ ] Delivery zone validation
- [ ] Delivery fee calculation
- [ ] Driver assignment (future: integration with DoorDash/Uber Eats API)
- [ ] Delivery tracking

**Status**: ❌ 0% Complete
**Priority**: 🟡 Medium (pickup-only sufficient for MVP)
**Estimated Effort**: 3-4 weeks

---

#### 10. Enhanced Analytics 🟡

- [ ] Revenue dashboards (daily, weekly, monthly)
- [ ] Customer cohort analysis
- [ ] Item popularity trends
- [ ] Busiest hours heatmap
- [ ] Loyalty program effectiveness
- [ ] Inventory turnover rates
- [ ] Staff performance metrics
- [ ] Export to CSV/PDF

**Status**: ⚠️ 20% Complete (basic reports exist)
**Priority**: 🟡 Medium
**Estimated Effort**: 2 weeks

---

### P2 (Nice to Have - Delight) 🔴 NOT STARTED

#### 11. Advanced Customer Features 🔴

- [ ] Saved favorites (quick reorder)
- [ ] Scheduled orders (order for later time)
- [ ] Dietary preferences (auto-filter menu)
- [ ] Order templates (repeat complex orders)
- [ ] Split payments (pay with multiple methods)
- [ ] Tip jar (add tip to order)

**Status**: ❌ 0% Complete
**Priority**: 🟢 Low (future enhancement)
**Estimated Effort**: 2-3 weeks

---

#### 12. Customer Reviews & Ratings 🔴

- [ ] Rate orders (1-5 stars)
- [ ] Write reviews
- [ ] View item ratings
- [ ] Respond to reviews (staff)
- [ ] Display average ratings on menu

**Status**: ❌ 0% Complete
**Priority**: 🟢 Low
**Estimated Effort**: 1 week

---

#### 13. Gift Cards & Subscriptions 🔴

- [ ] Digital gift cards
- [ ] Gift card balance tracking
- [ ] Coffee subscriptions (weekly/monthly plans)
- [ ] Subscription management
- [ ] Auto-recurring orders

**Status**: ❌ 0% Complete
**Priority**: 🟢 Low (advanced monetization)
**Estimated Effort**: 3-4 weeks

---

#### 14. Referral Program 🔴

- [ ] Generate referral links
- [ ] Track referrals
- [ ] Reward referrer (points/discount)
- [ ] Reward referred (signup bonus)
- [ ] Referral leaderboard

**Status**: ❌ 0% Complete
**Priority**: 🟢 Low (growth hack)
**Estimated Effort**: 1 week

---

#### 15. Mobile Apps (iOS/Android) 🔴

- [ ] React Native / Expo app
- [ ] App Store submission
- [ ] Google Play submission
- [ ] Push notification support
- [ ] Deep linking (open specific items)

**Status**: ❌ 0% Complete
**Priority**: 🟢 Low (PWA sufficient for now)
**Estimated Effort**: 2-3 months

---

## 📊 Success Metrics

### Technical Metrics

| Metric                | Target | Current    | Status              |
| --------------------- | ------ | ---------- | ------------------- |
| **Page Load Time**    | <2s    | ❓ Unknown | ⚠️ Needs testing    |
| **API Response Time** | <200ms | ❓ Unknown | ⚠️ Needs testing    |
| **Uptime**            | 99.9%  | ❓ Unknown | ⚠️ Needs monitoring |
| **Error Rate**        | <0.1%  | ❓ Unknown | ⚠️ Needs tracking   |
| **TypeScript Errors** | 0      | ✅ 0       | ✅ Met              |
| **ESLint Errors**     | 0      | ✅ 0       | ✅ Met              |
| **Test Coverage**     | >80%   | ❌ 0%      | 🔴 Critical gap     |

### Business Metrics (Post-Launch)

| Metric                  | Target (Year 1)    | Current         |
| ----------------------- | ------------------ | --------------- |
| **# of Cafés**          | 50 tenants         | 0 (pre-launch)  |
| **Orders/Day**          | 500 orders         | 0 (pre-launch)  |
| **Revenue**             | $50k MRR           | $0 (pre-launch) |
| **Customer Retention**  | 60% monthly        | -               |
| **Average Order Value** | €8-12              | -               |
| **Mobile Orders %**     | 40% of total sales | -               |

### User Satisfaction Metrics

| Metric                 | Target |
| ---------------------- | ------ |
| **Customer NPS**       | >50    |
| **Café Owner NPS**     | >60    |
| **Order Success Rate** | >95%   |
| **App Store Rating**   | >4.5/5 |

---

## 🎯 Non-Functional Requirements

### Performance

- Page load: <2 seconds (first contentful paint)
- API response: <200ms (p95)
- Real-time latency: <500ms (order status updates)
- Image optimization: WebP format, lazy loading
- Bundle size: <500KB initial JavaScript

### Scalability

- 100 tenants (Phase 1 target)
- 10,000 orders/day platform-wide
- 1,000 concurrent users
- Database: Handle 10M+ order records

### Security

- SOC 2 compliant (future)
- GDPR compliant
- PCI DSS compliant (for payments)
- JWT-based authentication
- Row-Level Security on all tables
- HTTPS only
- No hardcoded secrets

### Reliability

- 99.9% uptime (8.76 hours downtime/year max)
- Automated backups (daily)
- Disaster recovery plan
- Zero data loss on failures

### Usability

- Mobile-first design
- PWA installable
- Offline support (view menu, view past orders)
- Accessibility (WCAG 2.1 AA)
- Multi-language support (future)

---

## 🚀 Roadmap Summary

| Phase                          | Status      | Completion | Duration   |
| ------------------------------ | ----------- | ---------- | ---------- |
| **Phase 1-2**: Foundation      | ✅ Complete | 100%       | Completed  |
| **Phase 3**: Menu & Orders     | ✅ Complete | 100%       | Completed  |
| **Phase 4**: Customer Shop     | ✅ Complete | 100%       | Completed  |
| **Phase 5**: Staff Operations  | ✅ Complete | 100%       | Completed  |
| **Phase 6**: Payments & Comms  | ⏭️ Next     | 0%         | 2-3 months |
| **Phase 7**: Advanced Features | 🔮 Future   | 0%         | 3-4 months |
| **Phase 8**: Production Polish | 🔮 Future   | 0%         | 2 months   |

**Overall Progress**: ✅ 50% Complete (50% of full vision)

---

**Last Updated**: 2025-11-19
**Maintained By**: Leon (Project Owner)
**Contributors**: Claude (AI Assistant), Development Team
