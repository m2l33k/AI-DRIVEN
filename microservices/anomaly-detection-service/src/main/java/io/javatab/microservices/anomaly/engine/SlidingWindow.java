package io.javatab.microservices.anomaly.engine;

import java.util.ArrayDeque;
import java.util.Deque;

public class SlidingWindow {

    private final int capacity;
    private final Deque<Double> values = new ArrayDeque<>();
    private double sum = 0;

    public SlidingWindow(int capacity) {
        this.capacity = capacity;
    }

    public void add(double value) {
        if (values.size() >= capacity) {
            sum -= values.removeFirst();
        }
        values.addLast(value);
        sum += value;
    }

    public double mean() {
        return values.isEmpty() ? 0 : sum / values.size();
    }

    public double stddev() {
        if (values.size() < 2) return 0;
        double m = mean();
        double variance = values.stream().mapToDouble(v -> (v - m) * (v - m)).average().orElse(0);
        return Math.sqrt(variance);
    }

    public int size() {
        return values.size();
    }
}
