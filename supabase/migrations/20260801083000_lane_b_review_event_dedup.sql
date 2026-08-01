-- PLAN-21 follow-up (CodeRabbit + Codex review on PR #67): the review-event
-- capability endpoint has no auth beyond the order UUID itself, so without a
-- bound a guest could replay POST /api/orders/[id]/review-event indefinitely,
-- inflating review metrics and the activity feed. The route now also checks
-- the order is settled before inserting; this index makes the insert itself
-- idempotent at the DB level so duplicate/parallel requests for the same
-- order + event type collapse to a single row instead of relying on
-- app-level locking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_review_once
    ON events (type, (payload ->> 'order_id'))
    WHERE type IN ('review.prompted', 'review.clicked');
