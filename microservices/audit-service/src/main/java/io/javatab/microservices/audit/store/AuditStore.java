package io.javatab.microservices.audit.store;

import io.javatab.microservices.audit.model.AuditEntry;
import io.javatab.microservices.audit.model.AuditStats;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class AuditStore {

    private static final Logger log = LoggerFactory.getLogger(AuditStore.class);
    private static final int MAX_ENTRIES = 10_000;

    private final Deque<AuditEntry> entries = new ConcurrentLinkedDeque<>();
    private final AtomicLong seq = new AtomicLong(0);

    public void append(AuditEntry entry) {
        entries.addFirst(entry);
        while (entries.size() > MAX_ENTRIES) entries.removeLast();
        log.info("[AUDIT] {} {} {} → {}", entry.actor(), entry.action(), entry.resource(), entry.outcome());
    }

    public List<AuditEntry> query(String q, String outcome, String actor, int limit) {
        String ql = q       == null ? "" : q.toLowerCase();
        String oc = outcome == null ? "" : outcome;
        String ac = actor   == null ? "" : actor.toLowerCase();

        return entries.stream()
                .filter(e -> oc.isEmpty() || oc.equalsIgnoreCase(e.outcome()))
                .filter(e -> ac.isEmpty() || e.actor().toLowerCase().contains(ac))
                .filter(e -> ql.isEmpty()
                        || e.actor().toLowerCase().contains(ql)
                        || e.action().toLowerCase().contains(ql)
                        || e.resource().toLowerCase().contains(ql)
                        || (e.details() != null && e.details().toLowerCase().contains(ql)))
                .limit(limit > 0 ? limit : 200)
                .toList();
    }

    public AuditStats stats() {
        long now          = System.currentTimeMillis();
        long sevenDaysMs  = 7L * 24 * 3_600_000L;

        List<AuditEntry> week = entries.stream()
                .filter(e -> e.timestamp().toEpochMilli() > now - sevenDaysMs)
                .toList();

        long total   = week.size();
        long writes  = week.stream().filter(e -> isWrite(e.action())).count();
        long denied  = week.stream().filter(e -> "Denied".equalsIgnoreCase(e.outcome())).count();
        long active  = week.stream().map(AuditEntry::actor).distinct().count();
        long allowed = week.stream().filter(e -> "Allowed".equalsIgnoreCase(e.outcome())).count();
        long errored = week.stream().filter(e -> "Error".equalsIgnoreCase(e.outcome())).count();

        // per day — last 7 days oldest → newest
        List<Long>   perDay = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = 6; i >= 0; i--) {
            LocalDate day  = today.minusDays(i);
            long start = day.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
            long end   = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
            long cnt   = week.stream().filter(e -> {
                long ts = e.timestamp().toEpochMilli();
                return ts >= start && ts < end;
            }).count();
            perDay.add(cnt);
            labels.add(day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
        }

        // top actors
        Map<String, long[]> actorMap = new LinkedHashMap<>();
        Map<String, String>  roleMap = new HashMap<>();
        for (AuditEntry e : week) {
            long[] cnt = actorMap.computeIfAbsent(e.actor(), k -> new long[]{0, 0, 0});
            roleMap.putIfAbsent(e.actor(), e.role());
            if (isWrite(e.action())) cnt[1]++; else cnt[0]++;
            if ("Denied".equalsIgnoreCase(e.outcome())) cnt[2]++;
        }
        List<AuditStats.ActorSummary> top = actorMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(
                        b.getValue()[0] + b.getValue()[1],
                        a.getValue()[0] + a.getValue()[1]))
                .limit(6)
                .map(e -> new AuditStats.ActorSummary(
                        e.getKey(),
                        roleMap.getOrDefault(e.getKey(), "—"),
                        e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .toList();

        return new AuditStats(total, writes, denied, active,
                perDay, labels, allowed, errored, top);
    }

    private boolean isWrite(String action) {
        if (action == null) return false;
        return action.endsWith(":write")   || action.endsWith(":delete")
            || action.endsWith(":restart") || action.endsWith(":create")
            || action.endsWith(":inject");
    }
}
