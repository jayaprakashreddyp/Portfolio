(function () {
  if (typeof window === 'undefined') return;
  var send = function (name, props) {
    if (typeof window.plausible === 'function') {
      window.plausible(name, props ? { props: props } : undefined);
    }
  };

  // Section impressions: fire once when a section is >=50% visible.
  var seen = {};
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        if (!id || seen[id]) return;
        seen[id] = true;
        send('Section View', { section: id });
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('section[id]').forEach(function (s) { io.observe(s); });
  }

  // Scroll-depth milestones: 25 / 50 / 75 / 100.
  var marks = [25, 50, 75, 100];
  var hit = {};
  var onScroll = function () {
    var doc = document.documentElement;
    var scrolled = (window.scrollY || window.pageYOffset) + window.innerHeight;
    var height = doc.scrollHeight;
    if (height <= window.innerHeight) return;
    var pct = Math.min(100, Math.round((scrolled / height) * 100));
    marks.forEach(function (m) {
      if (!hit[m] && pct >= m) {
        hit[m] = true;
        send('Scroll Depth', { depth: String(m) });
      }
    });
  };
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  // Time-on-page: bucketed engagement signal sent on unload.
  var start = Date.now();
  var sent = false;
  var flushEngagement = function () {
    if (sent) return;
    sent = true;
    var seconds = Math.round((Date.now() - start) / 1000);
    var bucket = seconds < 10 ? '0-10s'
      : seconds < 30 ? '10-30s'
      : seconds < 60 ? '30-60s'
      : seconds < 180 ? '1-3m'
      : seconds < 600 ? '3-10m'
      : '10m+';
    send('Engaged Time', { bucket: bucket });
  };
  window.addEventListener('pagehide', flushEngagement);
  window.addEventListener('beforeunload', flushEngagement);
})();
