/* Time-aware, shape-preserving interpolation of manually annotated image points. */
(function (root) {
  "use strict";
  function slopes(points, axis) {
    const n = points.length;
    const h = points.slice(1).map((p, i) => p[0] - points[i][0]);
    const d = h.map((dt, i) => (points[i + 1][axis] - points[i][axis]) / dt);
    if (n === 2) return [d[0], d[0]];
    const m = new Array(n);
    function endpoint(h0, h1, d0, d1) {
      const value = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(value) !== Math.sign(d0)) return 0;
      if (Math.sign(d0) !== Math.sign(d1) && Math.abs(value) > 3 * Math.abs(d0)) return 3 * d0;
      return value;
    }
    m[0] = endpoint(h[0], h[1], d[0], d[1]);
    m[n - 1] = endpoint(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    return m;
  }
  function segments(points) {
    if (points.length < 2) return [];
    const mx = slopes(points, 1), my = slopes(points, 2);
    return points.slice(1).map((b, i) => {
      const a = points[i], dt = b[0] - a[0];
      if (!(dt > 0)) throw new Error("Flight annotations must have increasing timestamps");
      return {
        start: a[0], end: b[0], inferred: dt > .16,
        p: [[a[1], a[2]], [a[1] + mx[i] * dt / 3, a[2] + my[i] * dt / 3],
            [b[1] - mx[i + 1] * dt / 3, b[2] - my[i + 1] * dt / 3], [b[1], b[2]]]
      };
    });
  }
  const lerp = (a, b, u) => a.map((v, j) => v + (b[j] - v) * u);
  function partial(segment, time) {
    const u = Math.max(0, Math.min(1, (time - segment.start) / (segment.end - segment.start)));
    const [p0, p1, p2, p3] = segment.p;
    const q0 = lerp(p0, p1, u), q1 = lerp(p1, p2, u), q2 = lerp(p2, p3, u);
    const r0 = lerp(q0, q1, u), r1 = lerp(q1, q2, u);
    return [p0, q0, r0, lerp(r0, r1, u)];
  }
  function point(segment, time) { return partial(segment, time)[3]; }
  function path(segment, time) {
    if (time < segment.start) return "";
    const [a, b, c, d] = partial(segment, time);
    return `M ${a[0]} ${a[1]} C ${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`;
  }
  const api = {segments, point, path};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BoomerangCurve = api;
})(typeof window !== "undefined" ? window : globalThis);
