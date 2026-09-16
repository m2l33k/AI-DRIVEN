package io.javatab.microservices.anomaly.engine;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class SlidingWindowTest {

    private static final double EPS = 0.001;

    @Test
    void emptyWindowReturnsMeanZero() {
        SlidingWindow w = new SlidingWindow(10);
        assertThat(w.mean()).isZero();
        assertThat(w.size()).isZero();
    }

    @Test
    void stddevWithSingleValueIsZero() {
        SlidingWindow w = new SlidingWindow(10);
        w.add(42.0);
        assertThat(w.stddev()).isZero();
    }

    @Test
    void meanIsCorrectForKnownValues() {
        SlidingWindow w = new SlidingWindow(10);
        w.add(10.0);
        w.add(20.0);
        w.add(30.0);
        assertThat(w.mean()).isCloseTo(20.0, within(EPS));
    }

    @Test
    void stddevIsCorrectForKnownValues() {
        // values [2,4,4,4,5,5,7,9] — population stddev = 2.0
        SlidingWindow w = new SlidingWindow(20);
        for (double v : new double[]{2, 4, 4, 4, 5, 5, 7, 9}) w.add(v);
        assertThat(w.stddev()).isCloseTo(2.0, within(EPS));
    }

    @Test
    void oldestValueEvictedWhenCapacityExceeded() {
        SlidingWindow w = new SlidingWindow(3);
        w.add(100.0);
        w.add(1.0);
        w.add(1.0);
        w.add(1.0); // 100 evicted
        assertThat(w.mean()).isCloseTo(1.0, within(EPS));
        assertThat(w.size()).isEqualTo(3);
    }

    @Test
    void sizeNeverExceedsCapacity() {
        SlidingWindow w = new SlidingWindow(5);
        for (int i = 0; i < 20; i++) w.add(i);
        assertThat(w.size()).isEqualTo(5);
    }

    @Test
    void zScoreDetectsSpike() {
        SlidingWindow w = new SlidingWindow(30);
        // baseline: 10 samples around 100
        for (int i = 0; i < 15; i++) w.add(100.0 + (i % 3));
        double mean   = w.mean();
        double stddev = w.stddev();
        double spike  = 130.0;
        double z      = (spike - mean) / stddev;
        assertThat(z).isGreaterThan(3.0); // should fire anomaly
    }
}
