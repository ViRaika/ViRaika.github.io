// Toggle expand / collapse
function toggleBlog(header) {
  var card = header.closest('.blog-card');
  var isExpanded = card.dataset.expanded === 'true';
  card.dataset.expanded = isExpanded ? 'false' : 'true';
}

// Active share button timeout handle — keyed by slug
var shareTimers = {};

function sharePost(event, slug) {
  event.stopPropagation(); // don't toggle the card

  var url = window.location.origin + window.location.pathname + '#' + slug;
  var clickedBtn = event.currentTarget;

  // Reset every OTHER share button immediately
  document.querySelectorAll('.blog-share-btn.copied').forEach(function (btn) {
    if (btn !== clickedBtn) {
      btn.classList.remove('copied');
      var otherSlug = btn.dataset.slug;
      if (shareTimers[otherSlug]) {
        clearTimeout(shareTimers[otherSlug]);
        delete shareTimers[otherSlug];
      }
    }
  });

  // Copy to clipboard
  function onCopied() {
    clickedBtn.classList.add('copied');

    // Clear any existing timer for this button
    if (shareTimers[slug]) clearTimeout(shareTimers[slug]);

    // Auto-reset after 2.2s
    shareTimers[slug] = setTimeout(function () {
      clickedBtn.classList.remove('copied');
      delete shareTimers[slug];
    }, 2200);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(onCopied).catch(onCopied);
  } else {
    // Fallback for older / non-secure contexts
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    onCopied();
  }
}

// On page load: if hash present, expand only that post and scroll to it
(function () {
  var hash = window.location.hash.slice(1);
  if (!hash) return;

  var target = document.getElementById(hash);
  if (!target) return;

  target.dataset.expanded = 'true';

  setTimeout(function () {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
})();
