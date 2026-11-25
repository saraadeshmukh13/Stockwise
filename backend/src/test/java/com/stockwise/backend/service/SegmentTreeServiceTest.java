package com.stockwise.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SegmentTreeServiceTest {
    @Test
    void sumsInclusiveRangeBeyondIntegerCapacity() {
        SegmentTreeService tree = new SegmentTreeService(new int[]{Integer.MAX_VALUE, Integer.MAX_VALUE, 7});

        assertEquals(4_294_967_294L, tree.querySum(0, 1));
        assertEquals(7L, tree.querySum(2, 2));
    }

    @Test
    void rejectsInvalidRanges() {
        SegmentTreeService tree = new SegmentTreeService(new int[]{3, 4});

        assertThrows(IllegalArgumentException.class, () -> tree.querySum(-1, 0));
        assertThrows(IllegalArgumentException.class, () -> tree.querySum(0, 2));
        assertThrows(IllegalArgumentException.class, () -> tree.querySum(1, 0));
        assertThrows(IllegalArgumentException.class, () -> new SegmentTreeService(new int[0]).querySum(0, 0));
    }
}
