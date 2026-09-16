package io.javatab.microservices.anomaly.store;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class AnomalyStore {

    private static final Logger log = LoggerFactory.getLogger(AnomalyStore.class);
    private static final int MAX_EVENTS = 500;

    private final Deque<AnomalyEvent> events = new ConcurrentLinkedDeque<>();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public void add(AnomalyEvent event) {
        events.addFirst(event);
        while (events.size() > MAX_EVENTS) events.removeLast();
        log.info("[ANOMALY] {} {} — {}", event.severity(), event.type(), event.message());
        pushToEmitters(event);
    }

    public List<AnomalyEvent> getRecent(int limit) {
        return events.stream().limit(limit).toList();
    }

    public void clear() {
        events.clear();
    }

    public SseEmitter registerEmitter() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    private void pushToEmitters(AnomalyEvent event) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("anomaly").data(event));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }
}
