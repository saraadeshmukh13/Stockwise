
package com.stockwise.backend.service;

public class SegmentTreeService {

    private long[] tree;
    private int n;

    public SegmentTreeService(int[] arr) {
        n = arr.length;
        tree = new long[Math.multiplyExact(4, n)];

        if (n > 0) {
            build(arr, 0, 0, n - 1);
        }
    }

    private void build(int[] arr, int node, int start, int end) {
        if (start == end) {
        tree[node] = arr[start];
            return;
        }

        int mid = (start + end) / 2;

        build(arr, 2 * node + 1, start, mid);
        build(arr, 2 * node + 2, mid + 1, end);

        tree[node] = Math.addExact(tree[2 * node + 1], tree[2 * node + 2]);
    }

    public long querySum(int left, int right) {
        if (n == 0 || left < 0 || right >= n || left > right) {
            throw new IllegalArgumentException("Invalid range");
        }

        return query(0, 0, n - 1, left, right);
    }

    private long query(int node, int start, int end,
                      int left, int right) {

        if (right < start || end < left) {
            return 0;
        }

        if (left <= start && end <= right) {
            return tree[node];
        }

        int mid = (start + end) / 2;

        long sumLeft = query(2 * node + 1, start, mid, left, right);
        long sumRight = query(2 * node + 2, mid + 1, end, left, right);

        return Math.addExact(sumLeft, sumRight);
    }
}
