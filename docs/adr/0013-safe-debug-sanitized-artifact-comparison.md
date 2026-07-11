# 0013 - Safe Debug compares sanitized artifacts only

## Status

Accepted

## Context

Debugging often means comparing a previous log, query result, or stack trace with a newer one. Developers need to see what changed without copying raw production data into an agent conversation.

## Decision

Safe Debug artifact comparison operates only on sanitized artifacts stored inside the session. The comparison returns compact added and removed sanitized lines, unchanged line counts, and artifact metadata.

Raw pasted values and token maps are not returned by the comparison API.

## Consequences

- Developers can quickly spot changed sanitized rows, errors, and log lines.
- Agents can reason over compact differences instead of full artifacts.
- The result is advisory line-level comparison; deeper CSV or JSON structural comparison can be added later without changing the safety boundary.
