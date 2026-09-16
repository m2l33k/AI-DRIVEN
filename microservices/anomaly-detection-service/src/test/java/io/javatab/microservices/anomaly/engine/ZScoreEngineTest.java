package io.javatab.microservices.anomaly.engine;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.store.AnomalyStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZScoreEngineTest {

    @Mock
    private AnomalyStore store;

    @Captor
    private ArgumentCaptor<AnomalyEvent> eventCaptor;

    private ZScoreEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ZScoreEngine(store);
        ReflectionTestUtils.setField(engine, "zThreshold", 3.0);
        ReflectionTestUtils.setField(engine, "windowSize", 30);
    }

    @Test
    void noAlertFiredBeforeMinimumWindowSize() {
        // feed 9 samples (< 10 minimum) — engine should stay silent
        for (int i = 0; i < 9; i++) engine.evaluate(10.0, 0.5);
        verifyNoInteractions(store);
    }

    @Test
    void noAlertOnNormalBaseline() {
        // 20 samples around 100 — no spike
        for (int i = 0; i < 20; i++) engine.evaluate(100.0 + (i % 2), 1.0);
        verifyNoInteractions(store);
    }

    @Test
    void alertFiredWhenRegRateSpikeExceedsThreshold() {
        // establish baseline of 30 samples at ~100
        for (int i = 0; i < 30; i++) engine.evaluate(100.0, 1.0);
        // spike to 200 — z will be >> 3
        engine.evaluate(200.0, 1.0);

        verify(store, atLeastOnce()).add(eventCaptor.capture());
        AnomalyEvent fired = eventCaptor.getValue();
        assertThat(fired.zScore()).isGreaterThan(3.0);
        assertThat(fired.type()).isEqualTo("AUTH_FAILURE_SPIKE");
    }

    @Test
    void dedupPreventsDoubleAlertWithinCooldown() {
        for (int i = 0; i < 30; i++) engine.evaluate(100.0, 1.0);
        // two spikes in quick succession — dedup window = 60s; both calls within same second
        engine.evaluate(200.0, 1.0);
        engine.evaluate(200.0, 1.0);
        // only one alert should be stored (dedup)
        verify(store, times(1)).add(any());
    }

    @Test
    void zeroStddevDoesNotFireAlert() {
        // all identical values → stddev = 0 → guard prevents division by zero
        for (int i = 0; i < 20; i++) engine.evaluate(50.0, 0.0);
        verifyNoInteractions(store);
    }
}
